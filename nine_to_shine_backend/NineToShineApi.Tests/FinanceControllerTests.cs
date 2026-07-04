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

    [Fact]
    public async Task Create_trip_split_distributes_leftover_cents_to_lowest_user_ids()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var bob = TestUser("Bob", "bob@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, bob, season);

        var response = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            occurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            direction = "expense",
            amount = 10.00m,
            description = "Urlaub (Ausgabe)",
            seasonId = season.Id,
            userIds = new[] { bob.Id, nina.Id, alex.Id }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();

        created.Should().NotBeNull();
        var createdRows = created!;
        createdRows.Should().HaveCount(3);
        createdRows.Sum(x => x.Amount).Should().Be(10.00m);
        createdRows.Should().OnlyContain(x => x.Category == "TRIP");
        createdRows.Should().OnlyContain(x => x.Direction == "expense");

        var sortedUserIds = new[] { nina.Id, alex.Id, bob.Id }.OrderBy(id => id).ToList();
        createdRows.Single(x => x.UserId == sortedUserIds[0]).Amount.Should().Be(3.34m);
        createdRows.Single(x => x.UserId == sortedUserIds[1]).Amount.Should().Be(3.33m);
        createdRows.Single(x => x.UserId == sortedUserIds[2]).Amount.Should().Be(3.33m);
    }

    [Fact]
    public async Task Replace_trip_split_removes_old_trip_rows_and_creates_split_replacements()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var oldTripOne = TestFinance("expense", 1m, "TRIP", user: nina, seasonId: season.Id);
        var oldTripTwo = TestFinance("expense", 2m, "TRIP", user: alex, seasonId: season.Id);
        await SeedAsync(oldTripOne, oldTripTwo);

        var response = await Client.PostAsJsonAsync("/api/finance/trip/split/replace", new
        {
            transactionIds = new[] { oldTripOne.Id, oldTripTwo.Id },
            occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            direction = "expense",
            amount = 10.00m,
            description = "Urlaub (Ausgabe: Neu)",
            seasonId = season.Id,
            userIds = new[] { nina.Id, alex.Id }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();

        created.Should().NotBeNull();
        var createdRows = created!;
        createdRows.Should().HaveCount(2);
        createdRows.Sum(x => x.Amount).Should().Be(10.00m);
        createdRows.Should().OnlyContain(x => x.Amount == 5.00m);
        createdRows.Should().OnlyContain(x => x.Description == "Urlaub (Ausgabe: Neu)");

        var remaining = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .ToListAsync());

        remaining.Should().HaveCount(2);
        remaining.Should().NotContain(x => x.Id == oldTripOne.Id || x.Id == oldTripTwo.Id);
        remaining.Sum(x => x.Amount).Should().Be(10.00m);
    }

    [Fact]
    public async Task Trip_split_rejects_amounts_that_cannot_give_every_user_one_cent()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var createResponse = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            direction = "expense",
            amount = 0.01m,
            seasonId = season.Id,
            userIds = new[] { nina.Id, alex.Id }
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var rowsAfterCreateRejection = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());

        rowsAfterCreateRejection.Should().BeEmpty();

        var oldTripOne = TestFinance("expense", 1m, "TRIP", user: nina, seasonId: season.Id);
        var oldTripTwo = TestFinance("expense", 2m, "TRIP", user: alex, seasonId: season.Id);
        await SeedAsync(oldTripOne, oldTripTwo);

        var replaceResponse = await Client.PostAsJsonAsync("/api/finance/trip/split/replace", new
        {
            transactionIds = new[] { oldTripOne.Id, oldTripTwo.Id },
            direction = "expense",
            amount = 0.01m,
            seasonId = season.Id,
            userIds = new[] { nina.Id, alex.Id }
        });

        replaceResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var rowsAfterReplaceRejection = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .ToListAsync());

        rowsAfterReplaceRejection.Should().HaveCount(2);
        rowsAfterReplaceRejection.Should().Contain(x => x.Id == oldTripOne.Id && x.Amount == 1m);
        rowsAfterReplaceRejection.Should().Contain(x => x.Id == oldTripTwo.Id && x.Amount == 2m);
    }

    [Fact]
    public async Task Trip_split_endpoints_reject_invalid_requests()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var season = TestSeason();
        await SeedAsync(nina, season);

        var invalidAmount = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            direction = "expense",
            amount = 10.001m,
            userIds = new[] { nina.Id }
        });

        var emptyUsers = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            direction = "expense",
            amount = 10.00m,
            userIds = Array.Empty<long>()
        });

        var missingUser = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            direction = "expense",
            amount = 10.00m,
            userIds = new[] { nina.Id + 999 }
        });

        var invalidSeason = await Client.PostAsJsonAsync("/api/finance/trip/split", new
        {
            direction = "expense",
            amount = 10.00m,
            seasonId = season.Id + 999,
            userIds = new[] { nina.Id }
        });

        var nonTrip = TestFinance("expense", 10m, "PIZZA", user: nina, seasonId: season.Id);
        await SeedAsync(nonTrip);

        var nonTripReplace = await Client.PostAsJsonAsync("/api/finance/trip/split/replace", new
        {
            transactionIds = new[] { nonTrip.Id },
            direction = "expense",
            amount = 10.00m,
            userIds = new[] { nina.Id }
        });

        invalidAmount.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        emptyUsers.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        missingUser.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        invalidSeason.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        nonTripReplace.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
