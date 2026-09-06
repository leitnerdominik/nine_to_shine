using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NineToShineApi.Data;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class DevelopmentDataSeederTests : IntegrationTestBase
{
    public DevelopmentDataSeederTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task First_execution_inserts_expected_baseline_data()
    {
        await RunSeederAsync();

        var snapshot = await GetSnapshotAsync();

        snapshot.Users.Should().Be(9);
        snapshot.ActiveUsers.Should().Be(7);
        snapshot.Seasons.Should().Be(2);
        snapshot.Games.Should().Be(6);
        snapshot.PastGames.Should().Be(5);
        snapshot.UpcomingGames.Should().Be(1);
        snapshot.Rankings.Should().Be(45);
        snapshot.Finance.Should().Be(24);
        snapshot.RotationMembers.Should().Be(10);
        snapshot.Duties.Should().Be(11);
        snapshot.SkippedDuties.Should().Be(2);
    }

    [Fact]
    public async Task Second_execution_does_not_create_duplicates()
    {
        await RunSeederAsync();
        var firstSnapshot = await GetSnapshotAsync();

        await RunSeederAsync();
        var secondSnapshot = await GetSnapshotAsync();

        secondSnapshot.Should().Be(firstSnapshot);
    }

    [Fact]
    public async Task Seeded_relationships_and_constrained_values_are_valid()
    {
        await RunSeederAsync();

        await WithDbContextAsync(async db =>
        {
            var demoSeasonIds = await db.Season
                .Where(season =>
                    season.SeasonNumber == DevelopmentDataSeeder.PreviousDemoSeasonNumber ||
                    season.SeasonNumber == DevelopmentDataSeeder.DemoSeasonNumber)
                .Select(season => season.Id)
                .ToListAsync();
            var demoUserIds = await db.Users
                .Where(user => user.Email != null && user.Email.EndsWith(".nine-to-shine@example.test"))
                .Select(user => user.Id)
                .ToListAsync();
            var demoGames = await db.Game
                .Where(game => demoSeasonIds.Contains(game.SeasonId))
                .ToListAsync();
            var demoGameIds = demoGames.Select(game => game.Id).ToHashSet();
            var rankings = await db.Rankings
                .Where(ranking => demoGameIds.Contains(ranking.GameId))
                .ToListAsync();
            var finance = await db.Finance
                .Where(entry => entry.SeasonId.HasValue && demoSeasonIds.Contains(entry.SeasonId.Value))
                .ToListAsync();
            var rotationMembers = await db.OrganizerRotationMembers
                .Where(member => demoSeasonIds.Contains(member.SeasonId))
                .ToListAsync();
            var duties = await db.OrganizerDuties
                .Where(duty => demoSeasonIds.Contains(duty.SeasonId))
                .ToListAsync();

            demoGames.Should().OnlyContain(game => demoUserIds.Contains(game.OrganizedByUserId));
            rankings.Should().OnlyContain(ranking =>
                demoGameIds.Contains(ranking.GameId) &&
                demoUserIds.Contains(ranking.UserId) &&
                ranking.Points >= 0);
            rankings.GroupBy(ranking => new { ranking.GameId, ranking.UserId })
                .Should().OnlyContain(group => group.Count() == 1);
            rankings.Should().Contain(ranking => ranking.IsPresent && ranking.Points == 0);
            rankings.Should().Contain(ranking => !ranking.IsPresent && ranking.Points == 0);
            rankings.GroupBy(ranking => ranking.GameId)
                .Select(group => group.OrderByDescending(ranking => ranking.Points).First().UserId)
                .Distinct()
                .Should().HaveCountGreaterThan(1);

            finance.Should().OnlyContain(entry =>
                entry.Amount > 0 &&
                (entry.Direction == "income" || entry.Direction == "expense") &&
                entry.UpdatedAt != default);
            finance.Select(entry => entry.Category)
                .Should().Contain(["DUES", "FINE", "OTHER", "EVENT", "TRIP"]);
            finance.Should().Contain(entry => entry.UserId.HasValue);
            finance.Should().Contain(entry => entry.GameId.HasValue);
            finance.Where(entry => entry.UserId.HasValue)
                .Should().OnlyContain(entry => demoUserIds.Contains(entry.UserId!.Value));
            finance.Where(entry => entry.GameId.HasValue)
                .Should().OnlyContain(entry => demoGameIds.Contains(entry.GameId!.Value));

            rotationMembers.Should().OnlyContain(member =>
                demoUserIds.Contains(member.UserId) && demoSeasonIds.Contains(member.SeasonId));
            rotationMembers.GroupBy(member => new { member.SeasonId, member.SortOrder })
                .Should().OnlyContain(group => group.Count() == 1);
            duties.Should().OnlyContain(duty =>
                demoUserIds.Contains(duty.UserId) && demoSeasonIds.Contains(duty.SeasonId));
            duties.Should().Contain(duty => duty.IsSkipped);

            return true;
        });
    }

    private Task RunSeederAsync()
    {
        return WithDbContextAsync(async db =>
        {
            await DevelopmentDataSeeder.SeedAsync(db);
            return true;
        });
    }

    private Task<SeedSnapshot> GetSnapshotAsync()
    {
        return WithDbContextAsync(async db =>
        {
            var now = DateTime.UtcNow;
            var demoSeasonIds = await db.Season
                .Where(season =>
                    season.SeasonNumber == DevelopmentDataSeeder.PreviousDemoSeasonNumber ||
                    season.SeasonNumber == DevelopmentDataSeeder.DemoSeasonNumber)
                .Select(season => season.Id)
                .ToListAsync();
            var demoGameIds = await db.Game
                .Where(game => demoSeasonIds.Contains(game.SeasonId))
                .Select(game => game.Id)
                .ToListAsync();

            return new SeedSnapshot(
                await db.Users.CountAsync(user =>
                    user.Email != null && user.Email.EndsWith(".nine-to-shine@example.test")),
                await db.Users.CountAsync(user =>
                    user.Email != null &&
                    user.Email.EndsWith(".nine-to-shine@example.test") &&
                    user.IsActive),
                demoSeasonIds.Count,
                demoGameIds.Count,
                await db.Game.CountAsync(game => demoGameIds.Contains(game.Id) && game.PlayedAt <= now),
                await db.Game.CountAsync(game => demoGameIds.Contains(game.Id) && game.PlayedAt > now),
                await db.Rankings.CountAsync(ranking => demoGameIds.Contains(ranking.GameId)),
                await db.Finance.CountAsync(entry =>
                    entry.SeasonId.HasValue && demoSeasonIds.Contains(entry.SeasonId.Value)),
                await db.OrganizerRotationMembers.CountAsync(member => demoSeasonIds.Contains(member.SeasonId)),
                await db.OrganizerDuties.CountAsync(duty => demoSeasonIds.Contains(duty.SeasonId)),
                await db.OrganizerDuties.CountAsync(duty =>
                    demoSeasonIds.Contains(duty.SeasonId) && duty.IsSkipped));
        });
    }

    private sealed record SeedSnapshot(
        int Users,
        int ActiveUsers,
        int Seasons,
        int Games,
        int PastGames,
        int UpcomingGames,
        int Rankings,
        int Finance,
        int RotationMembers,
        int Duties,
        int SkippedDuties);
}

[Collection(IntegrationTestCollection.Name)]
public sealed class DevelopmentDataSeederStartupTests
{
    private readonly PostgresFixture _postgres;

    public DevelopmentDataSeederStartupTests(PostgresFixture postgres)
    {
        _postgres = postgres;
    }

    [Theory]
    [InlineData("Development", true, true)]
    [InlineData("Development", false, false)]
    [InlineData("Production", true, false)]
    [InlineData("Testing", true, false)]
    [InlineData("DevOnline", true, false)]
    public async Task Startup_seeds_only_when_development_and_flag_are_enabled(
        string environmentName,
        bool seedDevelopmentData,
        bool shouldSeed)
    {
        using (var resetFactory = new NineToShineApiFactory(_postgres.Lease))
        {
            _ = resetFactory.Server;
            await resetFactory.ResetDatabaseAsync();
        }

        using var factory = new NineToShineApiFactory(
            _postgres.Lease,
            environmentName,
            seedDevelopmentData);
        _ = factory.Server;

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var markerExists = await db.Season.AnyAsync(
            season => season.SeasonNumber == DevelopmentDataSeeder.DemoSeasonNumber);

        markerExists.Should().Be(shouldSeed);
    }
}
