using FluentAssertions;
using Microsoft.EntityFrameworkCore;
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
