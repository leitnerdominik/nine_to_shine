using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Controllers;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class FinanceControllerTests : IntegrationTestBase
{
    public FinanceControllerTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Create_validates_references_and_normalizes_category()
    {
        var user = TestUser();
        var season = TestSeason();
        var game = TestGame(season, user);
        await SeedAsync(user, season, game);

        var invalidUser = await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "income",
            amount = 12.50m,
            category = "dues",
            userId = user.Id + 999
        });
        invalidUser.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var invalidAmount = await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "income",
            amount = 0,
            category = "dues"
        });
        invalidAmount.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var createdResponse = await Client.PostAsJsonAsync("/api/finance", new
        {
            occurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            direction = "income",
            amount = 30m,
            category = "dues",
            userId = user.Id,
            seasonId = season.Id,
            gameId = game.Id
        });

        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createdResponse.Content.ReadFromJsonAsync<FinanceDto>();
        created.Should().NotBeNull();
        created!.Direction.Should().Be("income");
        created.Category.Should().Be("DUES");
        created.UserDisplayName.Should().Be(user.DisplayName);
        created.GameName.Should().Be(game.GameName);
    }

    [Fact]
    public async Task Balance_endpoints_and_filters_calculate_expected_totals()
    {
        var user = TestUser();
        var season = TestSeason();
        await SeedAsync(user, season);
        await SeedAsync(
            TestFinance("income", 100, "DUES", seasonId: season.Id),
            TestFinance("expense", 30, "PIZZA", seasonId: season.Id),
            TestFinance("income", 20, "DUES", user: user, seasonId: season.Id),
            TestFinance("expense", 5, "TRIP", user: user, seasonId: season.Id));

        var globalBalance = await Client.GetFromJsonAsync<decimal>("/api/finance/balance/global");
        var clubBalance = await Client.GetFromJsonAsync<decimal>("/api/finance/balance/club");
        var userBalance = await Client.GetFromJsonAsync<decimal>($"/api/finance/balance/user/{user.Id}");
        var globalScope = await Client.GetFromJsonAsync<List<FinanceDto>>("/api/finance?scope=global");
        var expenses = await Client.GetFromJsonAsync<List<FinanceDto>>("/api/finance?direction=expense");

        globalBalance.Should().Be(85m);
        clubBalance.Should().Be(70m);
        userBalance.Should().Be(15m);
        globalScope.Should().NotBeNull();
        globalScope!.Should().OnlyContain(x => x.UserId == null);
        expenses.Should().NotBeNull();
        expenses!.Should().OnlyContain(x => x.Direction == "expense");
    }

    [Fact]
    public async Task Delete_trips_by_date_deletes_only_trip_rows_for_that_day()
    {
        await SeedAsync(
            TestFinance(
                "expense",
                10,
                "TRIP",
                new DateTime(2026, 6, 15, 10, 0, 0, DateTimeKind.Utc)),
            TestFinance(
                "expense",
                20,
                "TRIP",
                new DateTime(2026, 6, 16, 10, 0, 0, DateTimeKind.Utc)),
            TestFinance(
                "expense",
                30,
                "PIZZA",
                new DateTime(2026, 6, 15, 11, 0, 0, DateTimeKind.Utc)));

        var response = await Client.DeleteAsync(
            "/api/finance/trip/by-date?date=2026-06-15T12%3A30%3A00.000Z");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var remaining = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(x => x.Amount)
            .ToListAsync());

        remaining.Should().HaveCount(2);
        remaining.Should().Contain(x => x.Category == "TRIP" && x.Amount == 20m);
        remaining.Should().Contain(x => x.Category == "PIZZA" && x.Amount == 30m);
    }
}
