using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NineToShineApi.Controllers;
using NineToShineApi.Data;
using NineToShineApi.Models;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class RankingControllerTests : IntegrationTestBase
{
    public RankingControllerTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Create_rejects_missing_refs_and_duplicate_rankings()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);

        var missingGame = await Client.PostAsJsonAsync("/api/ranking", new
        {
            gameId = game.Id + 999,
            userId = user.Id,
            points = 3
        });
        missingGame.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var created = await Client.PostAsJsonAsync("/api/ranking", new
        {
            gameId = game.Id,
            userId = user.Id,
            points = 4
        });
        created.StatusCode.Should().Be(HttpStatusCode.Created);

        var duplicate = await Client.PostAsJsonAsync("/api/ranking", new
        {
            gameId = game.Id,
            userId = user.Id,
            points = 5
        });
        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData(0, HttpStatusCode.Created)]
    [InlineData(10, HttpStatusCode.Created)]
    [InlineData(-1, HttpStatusCode.BadRequest)]
    [InlineData(11, HttpStatusCode.BadRequest)]
    public async Task Create_enforces_ranking_points_range(
        int points,
        HttpStatusCode expectedStatus)
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);

        var response = await Client.PostAsJsonAsync("/api/ranking", new
        {
            gameId = game.Id,
            userId = user.Id,
            points
        });

        response.StatusCode.Should().Be(expectedStatus);

        var persistedPoints = await WithDbContextAsync(db => db.Rankings
            .AsNoTracking()
            .Select(ranking => (int?)ranking.Points)
            .SingleOrDefaultAsync());
        if (expectedStatus == HttpStatusCode.Created)
            persistedPoints.Should().Be(points);
        else
            persistedPoints.Should().BeNull();
    }

    [Fact]
    public async Task Top_ranked_sums_points_for_selected_season_and_empty_returns_null()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var seasonOne = TestSeason(1);
        var seasonTwo = TestSeason(2);
        var seasonOneGame = TestGame(seasonOne, nina, "Season One");
        var seasonTwoGame = TestGame(seasonTwo, nina, "Season Two");
        await SeedAsync(nina, alex, seasonOne, seasonTwo, seasonOneGame, seasonTwoGame);
        await SeedAsync(
            TestRanking(seasonOneGame.Id, nina.Id, 4),
            TestRanking(seasonOneGame.Id, alex.Id, 7),
            TestRanking(seasonTwoGame.Id, nina.Id, 10));

        var top = await Client.GetFromJsonAsync<TopRankedDto>(
            $"/api/ranking/top?seasonId={seasonOne.Id}");
        var empty = await Client.GetFromJsonAsync<TopRankedDto?>(
            $"/api/ranking/top?seasonId={seasonOne.Id + 999}");

        top.Should().NotBeNull();
        top!.UserId.Should().Be(alex.Id);
        top.UserDisplayName.Should().Be("Alex");
        top.TotalPoints.Should().Be(7);
        empty.Should().BeNull();
    }

    [Theory]
    [InlineData(0, HttpStatusCode.OK)]
    [InlineData(10, HttpStatusCode.OK)]
    [InlineData(-1, HttpStatusCode.BadRequest)]
    [InlineData(11, HttpStatusCode.BadRequest)]
    public async Task Update_enforces_ranking_points_range(
        int points,
        HttpStatusCode expectedStatus)
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);
        await SeedAsync(TestRanking(game.Id, user.Id, 5));

        var ranking = await WithDbContextAsync(db => db.Rankings.AsNoTracking().SingleAsync());

        var response = await Client.PutAsJsonAsync($"/api/ranking/{ranking.Id}", new
        {
            points,
            isPresent = false
        });

        response.StatusCode.Should().Be(expectedStatus);

        var persisted = await WithDbContextAsync(db => db.Rankings
            .AsNoTracking()
            .SingleAsync());
        if (expectedStatus == HttpStatusCode.OK)
        {
            persisted.Points.Should().Be(points);
            persisted.IsPresent.Should().BeFalse();
        }
        else
        {
            persisted.Points.Should().Be(5);
            persisted.IsPresent.Should().BeTrue();
        }
    }

    [Fact]
    public async Task Delete_by_game_is_idempotent()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);
        await SeedAsync(TestRanking(game.Id, user.Id, 5));

        var firstDelete = await Client.DeleteAsync($"/api/ranking/by-game/{game.Id}");
        var secondDelete = await Client.DeleteAsync($"/api/ranking/by-game/{game.Id}");

        firstDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
        secondDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData(0, HttpStatusCode.OK)]
    [InlineData(10, HttpStatusCode.OK)]
    [InlineData(-1, HttpStatusCode.BadRequest)]
    [InlineData(11, HttpStatusCode.BadRequest)]
    public async Task Save_game_snapshot_enforces_ranking_points_range(
        int points,
        HttpStatusCode expectedStatus)
    {
        var user = TestUser();
        var season = TestSeason();
        await SeedAsync(user, season);

        var response = await Client.PostAsJsonAsync("/api/ranking/game-snapshot", new
        {
            seasonId = season.Id,
            playedAt = new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc),
            gameName = "Tennis",
            organizedByUserId = user.Id,
            rankings = new[]
            {
                new { userId = user.Id, points, isPresent = true }
            }
        });

        response.StatusCode.Should().Be(expectedStatus);

        var persisted = await WithDbContextAsync(async db => new
        {
            Games = await db.Game.AsNoTracking().CountAsync(),
            Points = await db.Rankings
                .AsNoTracking()
                .Select(ranking => (int?)ranking.Points)
                .SingleOrDefaultAsync()
        });
        if (expectedStatus == HttpStatusCode.OK)
        {
            persisted.Games.Should().Be(1);
            persisted.Points.Should().Be(points);
        }
        else
        {
            persisted.Games.Should().Be(0);
            persisted.Points.Should().BeNull();
        }
    }

    [Fact]
    public async Task Save_game_snapshot_creates_and_replaces_the_complete_snapshot()
    {
        var nina = TestUser();
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        var replacementSeason = TestSeason(2);
        await SeedAsync(nina, alex, season, replacementSeason);

        var create = await Client.PostAsJsonAsync("/api/ranking/game-snapshot", new
        {
            seasonId = season.Id,
            playedAt = new DateTime(2026, 9, 6, 18, 0, 0, DateTimeKind.Utc),
            gameName = "Tennis",
            organizedByUserId = nina.Id,
            rankings = new[]
            {
                new { userId = nina.Id, points = 9, isPresent = true },
                new { userId = alex.Id, points = 1, isPresent = false }
            }
        });

        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdGame = await create.Content.ReadFromJsonAsync<GameDto>();
        createdGame.Should().NotBeNull();
        var createdRankings = await WithDbContextAsync(db => db.Rankings
            .AsNoTracking()
            .OrderBy(ranking => ranking.UserId)
            .ToListAsync());
        createdRankings.Should().HaveCount(2);
        createdRankings.Should().Contain(ranking =>
            ranking.GameId == createdGame!.Id &&
            ranking.UserId == alex.Id &&
            ranking.Points == 1 &&
            !ranking.IsPresent);

        var update = await Client.PostAsJsonAsync("/api/ranking/game-snapshot", new
        {
            gameId = createdGame!.Id,
            seasonId = replacementSeason.Id,
            playedAt = new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc),
            gameName = "Badminton",
            organizedByUserId = alex.Id,
            rankings = new[]
            {
                new { userId = alex.Id, points = 7, isPresent = true }
            }
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var persisted = await WithDbContextAsync(async db => new
        {
            Game = await db.Game.AsNoTracking().SingleAsync(),
            Rankings = await db.Rankings.AsNoTracking().ToListAsync()
        });
        persisted.Game.GameName.Should().Be("Badminton");
        persisted.Game.SeasonId.Should().Be(replacementSeason.Id);
        persisted.Game.OrganizedByUserId.Should().Be(alex.Id);
        persisted.Game.PlayedAt.Should().Be(
            new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc));
        persisted.Rankings.Should().ContainSingle(ranking =>
            ranking.GameId == createdGame.Id &&
            ranking.UserId == alex.Id &&
            ranking.Points == 7 &&
            ranking.IsPresent);
    }

    [Fact]
    public async Task Save_game_snapshot_moves_booked_finance_to_new_season()
    {
        var user = TestUser();
        var season = TestSeason(1);
        var replacementSeason = TestSeason(2);
        var game = TestGame(season, user);
        await SeedAsync(user, season, replacementSeason, game);
        var finance = TestFinance("expense", 20m, "EVENT", game: game);
        await SeedAsync(finance);
        var originalVersion = finance.UpdatedAt;

        var response = await Client.PostAsJsonAsync("/api/ranking/game-snapshot", new
        {
            gameId = game.Id,
            seasonId = replacementSeason.Id,
            playedAt = game.PlayedAt,
            gameName = game.GameName,
            organizedByUserId = user.Id,
            rankings = new[]
            {
                new { userId = user.Id, points = 5, isPresent = true }
            }
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());

        var moved = await WithDbContextAsync(db => db.Finance.AsNoTracking().SingleAsync());
        moved.SeasonId.Should().Be(replacementSeason.Id);
        moved.GameId.Should().Be(game.Id);
        moved.UpdatedAt.Should().BeAfter(originalVersion);
    }

    [Fact]
    public async Task Save_game_snapshot_rolls_back_metadata_and_rankings_when_a_ranking_fails()
    {
        var nina = TestUser();
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        var replacementSeason = TestSeason(2);
        var game = TestGame(season, nina);
        await SeedAsync(nina, alex, season, replacementSeason, game);
        var finance = TestFinance("expense", 20m, "EVENT", game: game);
        await SeedAsync(
            TestRanking(game.Id, nina.Id, 9),
            TestRanking(game.Id, alex.Id, 4),
            finance);
        var originalFinanceVersion = finance.UpdatedAt;

        var originalRankings = await WithDbContextAsync(db => db.Rankings
            .AsNoTracking()
            .OrderBy(ranking => ranking.Id)
            .Select(ranking => new
            {
                ranking.Id,
                ranking.GameId,
                ranking.UserId,
                ranking.Points,
                ranking.IsPresent
            })
            .ToListAsync());
        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .AddInterceptors(new RankingSaveFailureInterceptor())
            .Options;

        var request = new SaveRankedGameRequest
        {
            GameId = game.Id,
            SeasonId = replacementSeason.Id,
            PlayedAt = new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc),
            GameName = "Changed game",
            OrganizedByUserId = alex.Id,
            Rankings =
            [
                new RankingSnapshotEntryRequest
                {
                    UserId = nina.Id,
                    Points = 8,
                    IsPresent = true
                },
                new RankingSnapshotEntryRequest
                {
                    UserId = alex.Id,
                    Points = 5,
                    IsPresent = true
                }
            ]
        };

        await ForceRankingSaveFailureAsync(options, request);

        var persisted = await WithDbContextAsync(async db => new
        {
            Game = await db.Game.AsNoTracking().SingleAsync(),
            Rankings = await db.Rankings
                .AsNoTracking()
                .OrderBy(ranking => ranking.Id)
                .Select(ranking => new
                {
                    ranking.Id,
                    ranking.GameId,
                    ranking.UserId,
                    ranking.Points,
                    ranking.IsPresent
                })
                .ToListAsync(),
            Finance = await db.Finance.AsNoTracking().SingleAsync()
        });
        persisted.Game.SeasonId.Should().Be(season.Id);
        persisted.Game.PlayedAt.Should().Be(
            new DateTime(2026, 6, 15, 18, 0, 0, DateTimeKind.Utc));
        persisted.Game.GameName.Should().Be("Tennis");
        persisted.Game.OrganizedByUserId.Should().Be(nina.Id);
        persisted.Rankings.Should().BeEquivalentTo(originalRankings, options =>
            options.WithStrictOrdering());
        persisted.Finance.SeasonId.Should().Be(season.Id);
        persisted.Finance.UpdatedAt.Should().Be(originalFinanceVersion);
    }

    [Fact]
    public async Task Save_game_snapshot_rolls_back_a_new_game_when_a_ranking_fails()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .AddInterceptors(new RankingSaveFailureInterceptor())
            .Options;
        var request = new SaveRankedGameRequest
        {
            SeasonId = season.Id,
            PlayedAt = new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc),
            GameName = "Orphan candidate",
            OrganizedByUserId = nina.Id,
            Rankings =
            [
                new RankingSnapshotEntryRequest
                {
                    UserId = nina.Id,
                    Points = 9,
                    IsPresent = true
                }
            ]
        };

        await ForceRankingSaveFailureAsync(options, request);

        var rowCounts = await WithDbContextAsync(async db => new
        {
            Games = await db.Game.CountAsync(),
            Rankings = await db.Rankings.CountAsync()
        });
        rowCounts.Games.Should().Be(0);
        rowCounts.Rankings.Should().Be(0);
    }

    [Fact]
    public async Task Save_game_snapshot_rejects_duplicate_users_without_changing_existing_data()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);
        await SeedAsync(TestRanking(game.Id, nina.Id, 9));

        var response = await Client.PostAsJsonAsync("/api/ranking/game-snapshot", new
        {
            gameId = game.Id,
            seasonId = season.Id,
            playedAt = new DateTime(2026, 9, 7, 18, 0, 0, DateTimeKind.Utc),
            gameName = "Changed game",
            organizedByUserId = nina.Id,
            rankings = new[]
            {
                new { userId = nina.Id, points = 8, isPresent = true },
                new { userId = nina.Id, points = 7, isPresent = true }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var persisted = await WithDbContextAsync(async db => new
        {
            Game = await db.Game.AsNoTracking().SingleAsync(),
            Rankings = await db.Rankings.AsNoTracking().ToListAsync()
        });
        persisted.Game.GameName.Should().Be("Tennis");
        persisted.Game.PlayedAt.Should().Be(
            new DateTime(2026, 6, 15, 18, 0, 0, DateTimeKind.Utc));
        persisted.Rankings.Should().ContainSingle(ranking =>
            ranking.GameId == game.Id &&
            ranking.UserId == nina.Id &&
            ranking.Points == 9);
    }

    private static async Task ForceRankingSaveFailureAsync(
        DbContextOptions<AppDbContext> options,
        SaveRankedGameRequest request)
    {
        await using var db = new AppDbContext(options);
        var controller = new RankingController(db);
        Func<Task> act = async () =>
            await controller.SaveGameSnapshot(request, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Forced ranking save failure.");
    }

    private sealed class RankingSaveFailureInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (eventData.Context?.ChangeTracker.Entries<Ranking>()
                .Any(entry => entry.State == EntityState.Added) == true)
            {
                return ValueTask.FromException<InterceptionResult<int>>(
                    new InvalidOperationException("Forced ranking save failure."));
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }
}
