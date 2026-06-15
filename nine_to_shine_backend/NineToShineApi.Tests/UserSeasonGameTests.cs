using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Controllers;
using NineToShineApi.Models;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class UserSeasonGameTests : IntegrationTestBase
{
    public UserSeasonGameTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task User_create_trims_display_name_and_duplicate_email_conflicts()
    {
        var createResponse = await Client.PostAsJsonAsync("/api/user", new
        {
            displayName = "  Nina  ",
            email = "nina@example.test"
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        created.Should().NotBeNull();
        created!.DisplayName.Should().Be("Nina");
        created.Email.Should().Be("nina@example.test");
        createResponse.Headers.Location!.ToString().Should().Contain($"/api/User/{created.Id}");

        var duplicateResponse = await Client.PostAsJsonAsync("/api/user", new
        {
            displayName = "Other",
            email = "nina@example.test"
        });

        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Season_create_rejects_duplicates_and_lists_sorted()
    {
        var highSeason = await Client.PostAsJsonAsync("/api/season", new { seasonNumber = 3 });
        var lowSeason = await Client.PostAsJsonAsync("/api/season", new { seasonNumber = 1 });

        highSeason.StatusCode.Should().Be(HttpStatusCode.Created);
        lowSeason.StatusCode.Should().Be(HttpStatusCode.Created);

        var duplicate = await Client.PostAsJsonAsync("/api/season", new { seasonNumber = 3 });
        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var seasons = await Client.GetFromJsonAsync<List<SeasonDto>>("/api/season");
        seasons.Should().NotBeNull();
        seasons!.Select(x => x.SeasonNumber).Should().Equal(1, 3);
    }

    [Fact]
    public async Task Game_create_validates_references_and_update_preserves_played_at_when_omitted()
    {
        var organizer = TestUser("Organizer", "organizer@example.test");
        var season = TestSeason();
        await SeedAsync(organizer, season);

        var missingSeason = await Client.PostAsJsonAsync("/api/game", new
        {
            seasonId = season.Id + 999,
            gameName = "Tennis",
            organizedByUserId = organizer.Id
        });
        missingSeason.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var playedAt = new DateTime(2026, 6, 15, 18, 0, 0, DateTimeKind.Utc);
        var createResponse = await Client.PostAsJsonAsync("/api/game", new
        {
            seasonId = season.Id,
            playedAt,
            gameName = "  Tennis  ",
            organizedByUserId = organizer.Id
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<GameDto>();
        created.Should().NotBeNull();
        created!.GameName.Should().Be("Tennis");

        var updateResponse = await Client.PutAsJsonAsync($"/api/game/{created.Id}", new
        {
            seasonId = season.Id,
            gameName = "Poker",
            organizedByUserId = organizer.Id
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<GameDto>();
        updated.Should().NotBeNull();
        updated!.GameName.Should().Be("Poker");
        updated.PlayedAt.Should().Be(playedAt);
    }

    [Fact]
    public async Task Games_with_bookings_only_returns_games_with_finance_rows()
    {
        var organizer = TestUser("Organizer", "organizer@example.test");
        var season = TestSeason();
        var bookedGame = TestGame(season, organizer, "Booked");
        var unbookedGame = TestGame(season, organizer, "Unbooked");
        await SeedAsync(
            organizer,
            season,
            bookedGame,
            unbookedGame,
            TestFinance("expense", 20, "PIZZA", game: bookedGame));

        var games = await Client.GetFromJsonAsync<List<GameDto>>("/api/game/with-bookings");

        games.Should().NotBeNull();
        games!.Should().ContainSingle(x => x.Id == bookedGame.Id);
        games.Should().NotContain(x => x.Id == unbookedGame.Id);
    }

    [Fact]
    public async Task Deleting_game_cascades_rankings()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);
        await SeedAsync(TestRanking(game.Id, user.Id, 5));

        var response = await Client.DeleteAsync($"/api/game/{game.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var rankingCount = await WithDbContextAsync(db => db.Rankings.CountAsync());
        rankingCount.Should().Be(0);
    }
}
