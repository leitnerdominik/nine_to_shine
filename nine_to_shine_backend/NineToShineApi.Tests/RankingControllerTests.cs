using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Controllers;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class RankingControllerTests : IntegrationTestBase
{
    public RankingControllerTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Create_rejects_missing_refs_duplicate_rankings_and_negative_points()
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

        var negativePoints = await Client.PostAsJsonAsync("/api/ranking", new
        {
            gameId = game.Id,
            userId = user.Id,
            points = -1
        });
        negativePoints.StatusCode.Should().Be(HttpStatusCode.BadRequest);

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
            TestRanking(seasonTwoGame.Id, nina.Id, 100));

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

    [Fact]
    public async Task Update_validates_points_range_and_delete_by_game_is_idempotent()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);
        await SeedAsync(TestRanking(game.Id, user.Id, 5));

        var ranking = await WithDbContextAsync(db => db.Rankings.AsNoTracking().SingleAsync());

        var invalidUpdate = await Client.PutAsJsonAsync($"/api/ranking/{ranking.Id}", new
        {
            points = 11,
            isPresent = false
        });
        invalidUpdate.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var validUpdate = await Client.PutAsJsonAsync($"/api/ranking/{ranking.Id}", new
        {
            points = 10,
            isPresent = false
        });
        validUpdate.StatusCode.Should().Be(HttpStatusCode.OK);

        var firstDelete = await Client.DeleteAsync($"/api/ranking/by-game/{game.Id}");
        var secondDelete = await Client.DeleteAsync($"/api/ranking/by-game/{game.Id}");

        firstDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
        secondDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
