using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Models;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class SchemaConstraintTests : IntegrationTestBase
{
    public SchemaConstraintTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Season_number_is_unique_at_database_level()
    {
        await SeedAsync(TestSeason(1));

        var act = async () => await WithDbContextAsync(async db =>
        {
            db.Season.Add(TestSeason(1));
            await db.SaveChangesAsync();
            return true;
        });

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Ranking_is_unique_per_game_and_user_at_database_level()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);
        await SeedAsync(TestRanking(game.Id, user.Id, 1));

        var act = async () => await WithDbContextAsync(async db =>
        {
            db.Rankings.Add(TestRanking(game.Id, user.Id, 2));
            await db.SaveChangesAsync();
            return true;
        });

        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(10, true)]
    [InlineData(-1, false)]
    [InlineData(11, false)]
    public async Task Ranking_points_range_is_enforced_at_database_level(
        int points,
        bool isValid)
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);

        var save = async () => await WithDbContextAsync(async db =>
        {
            db.Rankings.Add(TestRanking(game.Id, user.Id, points));
            await db.SaveChangesAsync();
            return true;
        });

        if (isValid)
            await save.Should().NotThrowAsync();
        else
            await save.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Ranking_points_migration_preserves_legacy_outliers_and_enforces_new_writes()
    {
        await Factory.ResetDatabaseAsync("20260906130000_AddOrganizerDutyManualOverrides");

        var nina = TestUser();
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, alex, season, game);
        await SeedAsync(TestRanking(game.Id, nina.Id, 11));

        await WithDbContextAsync(async db =>
        {
            var migrator = db.Database.GetService<IMigrator>();
            await migrator.MigrateAsync();
            return true;
        });

        var legacyPoints = await WithDbContextAsync(db => db.Rankings
            .AsNoTracking()
            .Where(ranking => ranking.UserId == nina.Id)
            .Select(ranking => ranking.Points)
            .SingleAsync());
        legacyPoints.Should().Be(11);

        var saveNewOutlier = async () => await WithDbContextAsync(async db =>
        {
            db.Rankings.Add(TestRanking(game.Id, alex.Id, 11));
            await db.SaveChangesAsync();
            return true;
        });

        await saveNewOutlier.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Finance_direction_and_positive_amount_constraints_are_enforced()
    {
        var invalidDirection = async () => await WithDbContextAsync(async db =>
        {
            db.Finance.Add(new Finance
            {
                Direction = "refund",
                Amount = 10m,
                Category = "OTHER",
                OccurredAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            return true;
        });

        await invalidDirection.Should().ThrowAsync<DbUpdateException>();

        var invalidAmount = async () => await WithDbContextAsync(async db =>
        {
            db.Finance.Add(new Finance
            {
                Direction = "income",
                Amount = 0m,
                Category = "OTHER",
                OccurredAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            return true;
        });

        await invalidAmount.Should().ThrowAsync<DbUpdateException>();
    }
}
