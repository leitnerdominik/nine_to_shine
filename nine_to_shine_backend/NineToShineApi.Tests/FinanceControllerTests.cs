using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NineToShineApi.Controllers;
using NineToShineApi.Data;
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
        var anotherUser = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(user, anotherUser, season);
        await SeedAsync(
            TestFinance("income", 100, "DUES", seasonId: season.Id),
            TestFinance("expense", 30, "PIZZA", seasonId: season.Id),
            TestFinance("income", 20, "DUES", user: user, seasonId: season.Id),
            TestFinance("expense", 5, "TRIP", user: user, seasonId: season.Id),
            TestFinance("income", 12, "DUES", user: anotherUser, seasonId: season.Id),
            TestFinance("expense", 2, "TRIP", user: anotherUser, seasonId: season.Id));

        var globalBalance = await Client.GetFromJsonAsync<decimal>("/api/finance/balance/global");
        var clubBalance = await Client.GetFromJsonAsync<decimal>("/api/finance/balance/club");
        var membersBalance = await Client.GetFromJsonAsync<decimal>("/api/finance/balance/members");
        var userBalance = await Client.GetFromJsonAsync<decimal>($"/api/finance/balance/user/{user.Id}");
        var globalScope = await Client.GetFromJsonAsync<List<FinanceDto>>("/api/finance?scope=global");
        var expenses = await Client.GetFromJsonAsync<List<FinanceDto>>("/api/finance?direction=expense");

        globalBalance.Should().Be(95m);
        clubBalance.Should().Be(70m);
        membersBalance.Should().Be(25m);
        userBalance.Should().Be(15m);
        globalScope.Should().NotBeNull();
        globalScope!.Should().OnlyContain(x => x.UserId == null);
        expenses.Should().NotBeNull();
        expenses!.Should().OnlyContain(x => x.Direction == "expense");
    }

    [Fact]
    public async Task Dues_status_returns_played_games_and_only_counts_qualifying_member_payments()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var inactive = TestUser("Inactive", "inactive@example.test");
        inactive.IsActive = false;
        var selectedSeason = TestSeason(1);
        var otherSeason = TestSeason(2);
        var openGame = TestGame(
            selectedSeason,
            nina,
            "Open game",
            new DateTime(2026, 6, 15, 18, 0, 0, DateTimeKind.Utc));
        var settledGame = TestGame(
            selectedSeason,
            nina,
            "Settled game",
            new DateTime(2026, 7, 15, 18, 0, 0, DateTimeKind.Utc));
        var gameWithoutBookings = TestGame(
            selectedSeason,
            nina,
            "No bookings game",
            new DateTime(2026, 5, 15, 18, 0, 0, DateTimeKind.Utc));
        var futureGame = TestGame(
            selectedSeason,
            nina,
            "Future game",
            new DateTime(2100, 1, 1, 18, 0, 0, DateTimeKind.Utc));
        var otherSeasonGame = TestGame(
            otherSeason,
            nina,
            "Other season game",
            new DateTime(2026, 5, 15, 18, 0, 0, DateTimeKind.Utc));

        await SeedAsync(
            nina,
            alex,
            inactive,
            selectedSeason,
            otherSeason,
            openGame,
            settledGame,
            gameWithoutBookings,
            futureGame,
            otherSeasonGame);

        await SeedAsync(
            TestFinance("income", 1m, "DUES", user: nina, game: openGame),
            TestFinance("income", 30m, "OTHER", user: alex, game: openGame),
            TestFinance("expense", 30m, "DUES", user: alex, game: openGame),
            TestFinance("income", 20m, "DUES", game: openGame),
            TestFinance("income", 30m, "DUES", user: inactive, game: openGame),
            TestFinance("income", 30m, "DUES", user: nina, game: settledGame),
            TestFinance("income", 30m, "DUES", user: alex, game: settledGame));

        var response = await Client.GetFromJsonAsync<List<GameDuesStatusDto>>(
            $"/api/finance/dues-status?seasonId={selectedSeason.Id}");

        response.Should().NotBeNull();
        var statuses = response!;
        statuses.Select(game => game.GameName).Should().Equal(
            "Settled game",
            "Open game",
            "No bookings game");

        var openStatus = statuses.Single(game => game.GameName == "Open game");
        openStatus.ActiveMemberCount.Should().Be(2);
        openStatus.PaidMemberCount.Should().Be(1);
        openStatus.UnpaidMembers.Should().ContainSingle();
        openStatus.UnpaidMembers[0].UserId.Should().Be(alex.Id);
        openStatus.UnpaidMembers[0].DisplayName.Should().Be("Alex");

        var settledStatus = statuses.Single(game => game.GameName == "Settled game");
        settledStatus.ActiveMemberCount.Should().Be(2);
        settledStatus.PaidMemberCount.Should().Be(2);
        settledStatus.UnpaidMembers.Should().BeEmpty();

        var noBookingsStatus = statuses.Single(game => game.GameName == "No bookings game");
        noBookingsStatus.ActiveMemberCount.Should().Be(2);
        noBookingsStatus.PaidMemberCount.Should().Be(0);
        noBookingsStatus.UnpaidMembers.Select(member => member.DisplayName)
            .Should().Equal("Alex", "Nina");
    }

    [Fact]
    public async Task Replace_game_deposits_is_atomic_and_preserves_unmanaged_rows()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var memberDues = TestFinance("income", 30m, "DUES", user: nina, game: game);
        memberDues.Description = "Mitgliedsbeitrag";
        var clubDues = TestFinance("income", 20m, "DUES", game: game);
        clubDues.Description = "Mitgliedsbeitrag (Nina)";
        var oldOtherIncome = TestFinance("income", 5m, "OTHER", game: game);
        var concurrentOtherIncome = TestFinance("income", 2m, "OTHER", game: game);
        var unrelatedIncome = TestFinance("income", 3m, "PRIZE", game: game);
        var expense = TestFinance("expense", 10m, "PIZZA", game: game);
        await SeedAsync(
            memberDues,
            clubDues,
            oldOtherIncome,
            concurrentOtherIncome,
            unrelatedIncome,
            expense);

        var response = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id, clubDues.Id, oldOtherIncome.Id },
                occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                members = new[]
                {
                    new
                    {
                        userId = nina.Id,
                        memberAmount = 60m,
                        clubAmount = 40m,
                        description = "Nachzahlung"
                    }
                },
                otherIncomes = new[]
                {
                    new { amount = 7m, description = "Restgeld" }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        created.Should().NotBeNull();
        created!.Should().HaveCount(3);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());

        rows.Should().HaveCount(6);
        rows.Should().NotContain(finance =>
            finance.Id == memberDues.Id ||
            finance.Id == clubDues.Id ||
            finance.Id == oldOtherIncome.Id);
        rows.Should().Contain(finance => finance.Id == concurrentOtherIncome.Id);
        rows.Should().Contain(finance => finance.Id == unrelatedIncome.Id);
        rows.Should().Contain(finance => finance.Id == expense.Id);
        rows.Should().Contain(finance =>
            finance.UserId == nina.Id &&
            finance.Category == "DUES" &&
            finance.Amount == 60m &&
            finance.Description == "Mitgliedsbeitrag - Nachzahlung");
        rows.Should().Contain(finance =>
            finance.UserId == null &&
            finance.Category == "DUES" &&
            finance.Amount == 40m &&
            finance.Description == "Mitgliedsbeitrag - Nachzahlung (Nina)");
        rows.Should().Contain(finance =>
            finance.Category == "OTHER" &&
            finance.Amount == 7m &&
            finance.Description == "Restgeld");
    }

    [Fact]
    public async Task Replace_game_deposits_can_add_rows_without_existing_deposits()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var response = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = Array.Empty<long>(),
                occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                members = new[]
                {
                    new
                    {
                        userId = nina.Id,
                        memberAmount = 30m,
                        clubAmount = 20m,
                        description = ""
                    }
                },
                otherIncomes = Array.Empty<object>()
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().HaveCount(2);
        rows.Should().OnlyContain(finance =>
            finance.GameId == game.Id &&
            finance.SeasonId == season.Id &&
            finance.Category == "DUES");
    }

    [Fact]
    public async Task Replace_game_deposits_deletes_rows_omitted_from_the_snapshot()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var memberDues = TestFinance("income", 30m, "DUES", user: nina, game: game);
        var clubDues = TestFinance("income", 20m, "DUES", game: game);
        var expense = TestFinance("expense", 10m, "PIZZA", game: game);
        await SeedAsync(memberDues, clubDues, expense);

        var response = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id, clubDues.Id },
                occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                members = Array.Empty<object>(),
                otherIncomes = Array.Empty<object>()
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        created.Should().BeEmpty();

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle(finance => finance.Id == expense.Id);
    }

    [Fact]
    public async Task Replace_game_deposits_rejects_invalid_requests_without_changing_rows()
    {
        var nina = TestUser();
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        var game = TestGame(season, nina);
        var otherGame = TestGame(season, alex, "Other game");
        await SeedAsync(nina, alex, season, game, otherGame);

        var memberDues = TestFinance("income", 30m, "DUES", user: nina, game: game);
        var otherGameDues = TestFinance("income", 30m, "DUES", user: alex, game: otherGame);
        var expense = TestFinance("expense", 10m, "PIZZA", game: game);
        await SeedAsync(memberDues, otherGameDues, expense);

        object ValidMember(long userId, decimal amount = 30m) => new
        {
            userId,
            memberAmount = amount,
            clubAmount = 20m,
            description = ""
        };

        var occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);
        var duplicateIds = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id, memberDues.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var duplicateUsers = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id), ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var invalidAmount = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id, 30.001m) },
                otherIncomes = Array.Empty<object>()
            });
        var missingUser = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id + 999) },
                otherIncomes = Array.Empty<object>()
            });
        var staleId = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { memberDues.Id + 999 },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var wrongGame = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { otherGameDues.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var nonEditable = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactionIds = new[] { expense.Id },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });

        duplicateIds.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        duplicateUsers.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        invalidAmount.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        missingUser.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        staleId.StatusCode.Should().Be(HttpStatusCode.Conflict);
        wrongGame.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        nonEditable.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Select(finance => finance.Id).Should().Equal(
            memberDues.Id,
            otherGameDues.Id,
            expense.Id);
    }

    [Fact]
    public async Task Replace_game_deposits_returns_conflict_when_rows_change_during_save()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var memberDues = TestFinance("income", 30m, "DUES", user: nina, game: game);
        await SeedAsync(memberDues);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .AddInterceptors(new ConcurrencyFailureInterceptor())
            .Options;

        await using var db = new AppDbContext(options);
        var controller = new FinanceController(db);
        var response = await controller.ReplaceGameDeposits(
            game.Id,
            new ReplaceGameDepositsRequest
            {
                TransactionIds = [memberDues.Id],
                OccurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                Members =
                [
                    new GameDepositMemberRequest
                    {
                        UserId = nina.Id,
                        MemberAmount = 60m,
                        ClubAmount = 40m
                    }
                ]
            },
            CancellationToken.None);

        response.Result.Should().BeOfType<ConflictObjectResult>();

        var rows = await WithDbContextAsync(context => context.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle(finance =>
            finance.Id == memberDues.Id && finance.Amount == 30m);
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

    private sealed class ConcurrencyFailureInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            return ValueTask.FromException<InterceptionResult<int>>(
                new DbUpdateConcurrencyException());
        }
    }
}
