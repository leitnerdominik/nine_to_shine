using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;
using NineToShineApi.Controllers;
using NineToShineApi.Data;
using NineToShineApi.Models;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class FinanceControllerTests : IntegrationTestBase
{
    public FinanceControllerTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Game_linked_finance_rejects_mismatched_seasons_atomically()
    {
        var user = TestUser();
        var gameSeason = TestSeason(1);
        var otherSeason = TestSeason(2);
        var game = TestGame(gameSeason, user);
        await SeedAsync(user, gameSeason, otherSeason, game);

        async Task AssertMismatch(HttpResponseMessage response)
        {
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var body = await response.Content.ReadAsStringAsync();
            body.Should().Contain("season_id must match game_id's season.");
        }

        await AssertMismatch(await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "expense", amount = 10m, category = "EVENT",
            seasonId = otherSeason.Id, gameId = game.Id
        }));

        await AssertMismatch(await Client.PostAsJsonAsync("/api/finance/deposits/batch", new
        {
            occurredAt = DateTime.UtcNow, seasonId = otherSeason.Id, gameId = game.Id,
            members = new[] { new { userId = user.Id, memberAmount = 10m, clubAmount = 0m } },
            otherIncomes = Array.Empty<object>()
        }));

        await AssertMismatch(await Client.PostAsJsonAsync("/api/finance/expenses/batch", new
        {
            occurredAt = DateTime.UtcNow, seasonId = otherSeason.Id, gameId = game.Id,
            items = new[] { new { amount = 10m, description = "bad season" } }
        }));

        var valid = await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "expense", amount = 11m, category = "EVENT", gameId = game.Id
        });
        valid.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await valid.Content.ReadFromJsonAsync<FinanceDto>();
        created!.SeasonId.Should().Be(gameSeason.Id);

        await AssertMismatch(await Client.PutAsJsonAsync($"/api/finance/{created.Id}", new
        {
            updatedAt = created.UpdatedAt, direction = "expense", amount = 12m,
            category = "EVENT", seasonId = otherSeason.Id, gameId = game.Id
        }));

        var derivedUpdate = await Client.PutAsJsonAsync($"/api/finance/{created.Id}", new
        {
            updatedAt = created.UpdatedAt, direction = "expense", amount = 13m,
            category = "EVENT", gameId = game.Id
        });
        derivedUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await derivedUpdate.Content.ReadFromJsonAsync<FinanceDto>();
        updated!.SeasonId.Should().Be(gameSeason.Id);

        var rows = await WithDbContextAsync(db => db.Finance.AsNoTracking().ToListAsync());
        rows.Should().ContainSingle(row => row.Id == created.Id && row.SeasonId == gameSeason.Id && row.Amount == 13m);
    }

    [Fact]
    public async Task Game_linked_create_waits_for_a_concurrent_season_move_and_uses_the_new_season()
    {
        var user = TestUser();
        var originalSeason = TestSeason(1);
        var replacementSeason = TestSeason(2);
        var game = TestGame(originalSeason, user);
        await SeedAsync(user, originalSeason, replacementSeason, game);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        await using var connection = new NpgsqlConnection(connectionString!);
        await connection.OpenAsync();
        await using var moveTransaction = await connection.BeginTransactionAsync();
        await using (var moveCommand = new NpgsqlCommand(
            "UPDATE game SET season_id = @seasonId WHERE id = @gameId",
            connection,
            moveTransaction))
        {
            moveCommand.Parameters.AddWithValue("seasonId", replacementSeason.Id);
            moveCommand.Parameters.AddWithValue("gameId", game.Id);
            await moveCommand.ExecuteNonQueryAsync();
        }

        var createTask = Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "expense",
            amount = 10m,
            category = "EVENT",
            gameId = game.Id
        });

        await Task.Delay(100);
        createTask.IsCompleted.Should().BeFalse();
        await moveTransaction.CommitAsync();

        var response = await createTask.WaitAsync(TimeSpan.FromSeconds(5));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<FinanceDto>();
        created!.SeasonId.Should().Be(replacementSeason.Id);
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
        created.UpdatedAt.Should().NotBe(default);
    }

    [Fact]
    public async Task Create_deposit_batch_creates_all_derived_rows()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);
        var response = await Client.PostAsJsonAsync("/api/finance/deposits/batch", new
        {
            occurredAt,
            seasonId = season.Id,
            gameId = game.Id,
            members = new[]
            {
                new
                {
                    userId = nina.Id,
                    memberAmount = 30m,
                    clubAmount = 20m,
                    description = "Bar"
                }
            },
            otherIncomes = new[]
            {
                new { amount = 5m, description = "Restgeld" }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        created.Should().HaveCount(3);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().Contain(finance =>
            finance.UserId == nina.Id &&
            finance.Direction == "income" &&
            finance.Category == "DUES" &&
            finance.Amount == 30m &&
            finance.Description == "Mitgliedsbeitrag - Bar");
        rows.Should().Contain(finance =>
            finance.UserId == null &&
            finance.Category == "DUES" &&
            finance.Amount == 20m &&
            finance.Description == "Mitgliedsbeitrag - Bar (Nina)");
        rows.Should().Contain(finance =>
            finance.UserId == null &&
            finance.Category == "OTHER" &&
            finance.Amount == 5m &&
            finance.Description == "Restgeld");
        rows.Should().OnlyContain(finance =>
            finance.OccurredAt == occurredAt &&
            finance.SeasonId == season.Id &&
            finance.GameId == game.Id);
    }

    [Fact]
    public async Task Create_deposit_batch_rejects_a_later_invalid_entry_without_persisting_rows()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var response = await Client.PostAsJsonAsync("/api/finance/deposits/batch", new
        {
            occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id,
            members = new[]
            {
                new { userId = nina.Id, memberAmount = 30m, clubAmount = 20m },
                new { userId = nina.Id + 999, memberAmount = 30m, clubAmount = 20m }
            },
            otherIncomes = Array.Empty<object>()
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var rows = await WithDbContextAsync(db => db.Finance.AsNoTracking().ToListAsync());
        rows.Should().BeEmpty();
    }

    [Fact]
    public async Task Create_expense_batch_creates_all_event_expenses()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var response = await Client.PostAsJsonAsync("/api/finance/expenses/batch", new
        {
            occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id,
            gameId = game.Id,
            items = new[]
            {
                new { amount = 12.50m, description = "Pizza" },
                new { amount = 7.50m, description = "Getränke" }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        created.Should().HaveCount(2);
        created.Should().OnlyContain(finance =>
            finance.Direction == "expense" &&
            finance.Category == "EVENT" &&
            finance.UserId == null &&
            finance.SeasonId == season.Id &&
            finance.GameId == game.Id);
        created!.Sum(finance => finance.Amount).Should().Be(20m);
    }

    [Fact]
    public async Task Create_batches_without_a_game_apply_domain_defaults()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var depositResponse = await Client.PostAsJsonAsync("/api/finance/deposits/batch", new
        {
            occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id,
            members = new[]
            {
                new
                {
                    userId = nina.Id,
                    memberAmount = 30m,
                    clubAmount = 20m,
                    description = "   "
                }
            },
            otherIncomes = new[]
            {
                new { amount = 5m, description = "   " }
            }
        });
        var expenseResponse = await Client.PostAsJsonAsync("/api/finance/expenses/batch", new
        {
            occurredAt = new DateTime(2026, 7, 2, 12, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id,
            items = new[] { new { amount = 12.50m, description = "Pizza" } }
        });

        depositResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        expenseResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().HaveCount(4);
        rows.Should().OnlyContain(finance => finance.GameId == null);
        rows.Should().Contain(finance =>
            finance.UserId == nina.Id &&
            finance.Category == "DUES" &&
            finance.Description == "Mitgliedsbeitrag");
        rows.Should().Contain(finance =>
            finance.UserId == null &&
            finance.Category == "DUES" &&
            finance.Description == "Mitgliedsbeitrag (Nina)");
        rows.Should().Contain(finance =>
            finance.Direction == "income" &&
            finance.Category == "OTHER" &&
            finance.Description == "Sonstige Einnahme");
        rows.Should().Contain(finance =>
            finance.Direction == "expense" &&
            finance.Category == "OTHER" &&
            finance.Description == "Pizza");
    }

    [Fact]
    public async Task Create_expense_batch_rejects_a_later_invalid_entry_without_persisting_rows()
    {
        var season = TestSeason();
        await SeedAsync(season);

        var response = await Client.PostAsJsonAsync("/api/finance/expenses/batch", new
        {
            occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id,
            items = new[]
            {
                new { amount = 12.50m, description = "Pizza" },
                new { amount = 0m, description = "Ungültig" }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var rows = await WithDbContextAsync(db => db.Finance.AsNoTracking().ToListAsync());
        rows.Should().BeEmpty();
    }

    [Fact]
    public async Task Finance_writes_reject_sub_cent_amounts_without_changing_persisted_rows()
    {
        var season = TestSeason();
        await SeedAsync(season);
        var existing = TestFinance("income", 25m, "DUES", seasonId: season.Id);
        await SeedAsync(existing);

        var createResponse = await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "expense",
            amount = 1.005m,
            category = "OTHER",
            seasonId = season.Id
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await createResponse.Content.ReadAsStringAsync())
            .Should().Contain("greater than 0 and have at most two decimal places");

        var updateResponse = await Client.PutAsJsonAsync($"/api/finance/{existing.Id}", new
        {
            updatedAt = existing.UpdatedAt,
            direction = "income",
            amount = 1.005m,
            category = "DUES",
            seasonId = season.Id
        });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var expenseBatchResponse = await Client.PostAsJsonAsync("/api/finance/expenses/batch", new
        {
            occurredAt = DateTime.UtcNow,
            seasonId = season.Id,
            items = new[]
            {
                new { amount = 12.50m, description = "Valid" },
                new { amount = 1.005m, description = "Sub-cent" }
            }
        });
        expenseBatchResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle();
        rows[0].Id.Should().Be(existing.Id);
        rows[0].Amount.Should().Be(25m);
    }

    [Fact]
    public async Task Create_batches_roll_back_when_save_fails_after_database_writes()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        DbContextOptions<AppDbContext> FailureOptions() =>
            new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(connectionString!)
                .AddInterceptors(new ConcurrencyFailureInterceptor())
                .Options;

        await using (var depositDb = new AppDbContext(FailureOptions()))
        {
            var controller = new FinanceController(depositDb);
            Func<Task> createDeposits = async () => await controller.CreateDepositBatch(
                new CreateDepositBatchRequest
                {
                    OccurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                    SeasonId = season.Id,
                    Members =
                    [
                        new GameDepositMemberRequest
                        {
                            UserId = nina.Id,
                            MemberAmount = 30m,
                            ClubAmount = 20m
                        }
                    ]
                },
                CancellationToken.None);

            await createDeposits.Should().ThrowAsync<DbUpdateConcurrencyException>();
        }

        var rowsAfterDeposits = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rowsAfterDeposits.Should().BeEmpty();

        await using (var expenseDb = new AppDbContext(FailureOptions()))
        {
            var controller = new FinanceController(expenseDb);
            Func<Task> createExpenses = async () => await controller.CreateExpenseBatch(
                new CreateExpenseBatchRequest
                {
                    OccurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                    SeasonId = season.Id,
                    Items =
                    [
                        new CreateExpenseBatchItemRequest
                        {
                            Amount = 12.50m,
                            Description = "Pizza"
                        },
                        new CreateExpenseBatchItemRequest
                        {
                            Amount = 7.50m,
                            Description = "Getränke"
                        }
                    ]
                },
                CancellationToken.None);

            await createExpenses.Should().ThrowAsync<DbUpdateConcurrencyException>();
        }

        var rowsAfterExpenses = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rowsAfterExpenses.Should().BeEmpty();
    }

    [Fact]
    public async Task Update_advances_updated_at_and_rejects_a_stale_version()
    {
        var finance = TestFinance("income", 30m, "DUES");
        await SeedAsync(finance);
        var originalVersion = finance.UpdatedAt;

        var updatedResponse = await Client.PutAsJsonAsync($"/api/finance/{finance.Id}", new
        {
            updatedAt = originalVersion,
            occurredAt = finance.OccurredAt,
            direction = "income",
            amount = 40m,
            category = "DUES",
            description = "Aktualisiert"
        });

        updatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updatedResponse.Content.ReadFromJsonAsync<FinanceDto>();
        updated.Should().NotBeNull();
        updated!.UpdatedAt.Should().BeAfter(originalVersion);

        var staleResponse = await Client.PutAsJsonAsync($"/api/finance/{finance.Id}", new
        {
            updatedAt = originalVersion,
            occurredAt = finance.OccurredAt,
            direction = "income",
            amount = 50m,
            category = "DUES"
        });

        staleResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var storedAmount = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .Where(row => row.Id == finance.Id)
            .Select(row => row.Amount)
            .SingleAsync());
        storedAmount.Should().Be(40m);
    }

    [Fact]
    public async Task Delete_requires_the_current_updated_at()
    {
        var finance = TestFinance("income", 30m, "DUES");
        await SeedAsync(finance);

        var missingVersion = await Client.DeleteAsync($"/api/finance/{finance.Id}");
        missingVersion.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var staleVersion = Uri.EscapeDataString(finance.UpdatedAt.AddTicks(-10).ToString("O"));
        var staleDelete = await Client.DeleteAsync(
            $"/api/finance/{finance.Id}?updatedAt={staleVersion}");
        staleDelete.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var currentVersion = Uri.EscapeDataString(finance.UpdatedAt.ToString("O"));
        var successfulDelete = await Client.DeleteAsync(
            $"/api/finance/{finance.Id}?updatedAt={currentVersion}");
        successfulDelete.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Bulk_delete_is_atomic_when_one_version_is_stale()
    {
        var first = TestFinance("income", 10m);
        var second = TestFinance("income", 20m);
        await SeedAsync(first, second);

        await WithDbContextAsync(async db =>
        {
            var row = await db.Finance.SingleAsync(finance => finance.Id == second.Id);
            row.Amount = 25m;
            await db.SaveChangesAsync();
            return row.UpdatedAt;
        });

        var response = await Client.PostAsJsonAsync("/api/finance/bulk-delete", new
        {
            transactions = new[] { Version(first), Version(second) }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var remainingIds = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .Select(finance => finance.Id)
            .ToListAsync());
        remainingIds.Should().Equal(first.Id, second.Id);
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
    public async Task Balance_overview_returns_all_users_and_totals_in_one_response()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var userWithoutTransactions = TestUser("Bob", "bob@example.test");
        userWithoutTransactions.IsActive = false;
        await SeedAsync(nina, alex, userWithoutTransactions);
        await SeedAsync(
            TestFinance("income", 100m),
            TestFinance("expense", 30m),
            TestFinance("income", 20m, user: nina),
            TestFinance("expense", 5m, user: nina),
            TestFinance("income", 12m, user: alex),
            TestFinance("expense", 2m, user: alex));

        var overview = await Client.GetFromJsonAsync<BalanceOverviewDto>(
            "/api/finance/balance/overview");

        overview.Should().NotBeNull();
        overview!.GlobalBalance.Should().Be(95m);
        overview.ClubBalance.Should().Be(70m);
        overview.MembersBalance.Should().Be(25m);
        overview.UserBalances.Should().Equal(
            new UserBalanceDto(nina.Id, nina.DisplayName, 15m),
            new UserBalanceDto(alex.Id, alex.DisplayName, 10m),
            new UserBalanceDto(
                userWithoutTransactions.Id,
                userWithoutTransactions.DisplayName,
                0m));
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
                transactions = new[]
                {
                    Version(memberDues),
                    Version(clubDues),
                    Version(oldOtherIncome),
                    Version(concurrentOtherIncome)
                },
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

        rows.Should().HaveCount(5);
        rows.Should().NotContain(finance =>
            finance.Id == memberDues.Id ||
            finance.Id == clubDues.Id ||
            finance.Id == oldOtherIncome.Id);
        rows.Should().NotContain(finance => finance.Id == concurrentOtherIncome.Id);
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
    public async Task Replace_game_deposits_conflicts_when_a_managed_row_is_added_after_editor_read()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);

        var originalDues = TestFinance("income", 30m, "DUES", user: nina, game: game);
        await SeedAsync(originalDues);

        var originalReference = Version(originalDues);
        var addedDues = TestFinance("income", 20m, "DUES", user: nina, game: game);
        await SeedAsync(addedDues);

        var response = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { originalReference },
                occurredAt = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
                members = new[]
                {
                    new
                    {
                        userId = nina.Id,
                        memberAmount = 60m,
                        clubAmount = 0m,
                        description = "Stale edit"
                    }
                },
                otherIncomes = Array.Empty<object>()
            });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().HaveCount(2);
        rows.Should().Contain(finance =>
            finance.Id == originalDues.Id && finance.Amount == 30m);
        rows.Should().Contain(finance =>
            finance.Id == addedDues.Id && finance.Amount == 20m);
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
                transactions = Array.Empty<object>(),
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
                transactions = new[] { Version(memberDues), Version(clubDues) },
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
                transactions = new[] { Version(memberDues), Version(memberDues) },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var duplicateUsers = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { Version(memberDues) },
                occurredAt,
                members = new[] { ValidMember(nina.Id), ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var invalidAmount = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { Version(memberDues) },
                occurredAt,
                members = new[] { ValidMember(nina.Id, 30.001m) },
                otherIncomes = Array.Empty<object>()
            });
        var missingUser = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { Version(memberDues) },
                occurredAt,
                members = new[] { ValidMember(nina.Id + 999) },
                otherIncomes = Array.Empty<object>()
            });
        var staleId = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[]
                {
                    new { id = memberDues.Id + 999, updatedAt = memberDues.UpdatedAt }
                },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var wrongGame = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { Version(otherGameDues) },
                occurredAt,
                members = new[] { ValidMember(nina.Id) },
                otherIncomes = Array.Empty<object>()
            });
        var nonEditable = await Client.PutAsJsonAsync(
            $"/api/finance/game/{game.Id}/deposits/replace",
            new
            {
                transactions = new[] { Version(expense) },
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
                Transactions =
                [
                    new FinanceVersionReference
                    {
                        Id = memberDues.Id,
                        UpdatedAt = memberDues.UpdatedAt
                    }
                ],
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
    public async Task Delete_trip_by_id_leaves_other_same_day_trip_untouched()
    {
        var firstTrip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 10, 0, 0, DateTimeKind.Utc),
            Name = "First"
        };
        var secondTrip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 15, 0, 0, DateTimeKind.Utc),
            Name = "Second"
        };
        await SeedAsync(firstTrip, secondTrip);
        await SeedAsync(
            TestFinance(
                "expense",
                10,
                "TRIP",
                firstTrip.OccurredAt,
                trip: firstTrip),
            TestFinance(
                "expense",
                20,
                "TRIP",
                secondTrip.OccurredAt,
                trip: secondTrip),
            TestFinance(
                "expense",
                30,
                "PIZZA",
                new DateTime(2026, 6, 15, 11, 0, 0, DateTimeKind.Utc)));

        var tripToDelete = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .SingleAsync(x => x.Category == "TRIP" && x.Amount == 10m));
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"/api/trips/{firstTrip.Id}")
        {
            Content = JsonContent.Create(new
            {
                transactions = new[] { Version(tripToDelete) }
            })
        };
        var response = await Client.SendAsync(request);

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

        var response = await Client.PostAsJsonAsync("/api/trips", new
        {
            occurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            name = "Urlaub",
            direction = "expense",
            amount = 10.00m,
            description = "Urlaub (Ausgabe)",
            seasonId = season.Id,
            userIds = new[] { bob.Id, nina.Id, alex.Id }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TripDetailsDto>();

        created.Should().NotBeNull();
        var createdRows = created!.Transactions;
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
    public async Task Add_trip_split_uses_the_trip_id_and_canonical_metadata()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);
        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);

        var response = await Client.PostAsJsonAsync($"/api/trips/{trip.Id}/splits", new
        {
            direction = "income",
            amount = 12.50m,
            description = "Rückerstattung",
            userIds = new[] { nina.Id }
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        created.Should().ContainSingle();
        created![0].TripId.Should().Be(trip.Id);
        created[0].OccurredAt.Should().Be(trip.OccurredAt);
        created[0].SeasonId.Should().Be(season.Id);

        var details = await Client.GetFromJsonAsync<TripDetailsDto>($"/api/trips/{trip.Id}");
        details.Should().NotBeNull();
        details!.Transactions.Should().ContainSingle(transaction =>
            transaction.TripId == trip.Id &&
            transaction.Direction == "income" &&
            transaction.Description == "Rückerstattung");
    }

    [Fact]
    public async Task Trips_with_the_same_timestamp_have_distinct_ids_and_delete_independently()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);
        var occurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        async Task<TripDetailsDto> CreateTrip(string name)
        {
            var response = await Client.PostAsJsonAsync("/api/trips", new
            {
                occurredAt,
                name,
                seasonId = season.Id,
                direction = "expense",
                amount = 10m,
                description = $"{name} (Anreise/Unterkunft)",
                userIds = new[] { nina.Id }
            });
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            return (await response.Content.ReadFromJsonAsync<TripDetailsDto>())!;
        }

        var first = await CreateTrip("First");
        var second = await CreateTrip("Second");
        first.Id.Should().NotBe(second.Id);

        var summaries = await Client.GetFromJsonAsync<List<TripSummaryDto>>("/api/trips");
        summaries.Should().Contain(summary => summary.Id == first.Id && summary.Name == "First");
        summaries.Should().Contain(summary => summary.Id == second.Id && summary.Name == "Second");

        var ordinaryRow = TestFinance("expense", 1m, "OTHER", occurredAt, nina, season.Id);
        await SeedAsync(ordinaryRow);

        async Task<HttpResponseMessage> DeleteTrip(
            long tripId,
            IEnumerable<FinanceVersionReference> references)
        {
            using var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, $"/api/trips/{tripId}")
            {
                Content = JsonContent.Create(new { transactions = references })
            };
            return await Client.SendAsync(deleteRequest);
        }

        var crossTripResponse = await DeleteTrip(
            first.Id,
            second.Transactions.Select(Version));
        var nonTripResponse = await DeleteTrip(first.Id, [Version(ordinaryRow)]);
        var missingResponse = await DeleteTrip(
            first.Id,
            [new FinanceVersionReference
            {
                Id = ordinaryRow.Id + 999,
                UpdatedAt = ordinaryRow.UpdatedAt
            }]);

        crossTripResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        nonTripResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        missingResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Client.GetAsync($"/api/trips/{first.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await Client.GetAsync($"/api/trips/{second.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);

        var deleteResponse = await DeleteTrip(first.Id, first.Transactions.Select(Version));
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await Client.GetAsync($"/api/trips/{first.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Client.GetAsync($"/api/trips/{second.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_trip_rejects_stale_incomplete_and_duplicate_snapshots_without_changes()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);
        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var first = TestFinance("expense", 5m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        var second = TestFinance("expense", 5m, "TRIP", trip.OccurredAt, alex, season.Id, trip: trip);
        await SeedAsync(first, second);

        async Task<HttpResponseMessage> Delete(IEnumerable<object> transactions)
        {
            using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/trips/{trip.Id}")
            {
                Content = JsonContent.Create(new { transactions })
            };
            return await Client.SendAsync(request);
        }

        var staleResponse = await Delete(
        [
            new
            {
                id = first.Id,
                updatedAt = first.UpdatedAt.AddTicks(-10)
            },
            Version(second)
        ]);
        var incompleteResponse = await Delete([Version(first)]);
        var duplicateResponse = await Delete([Version(first), Version(first)]);

        staleResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        incompleteResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await WithDbContextAsync(db => db.Trips.AnyAsync(candidate => candidate.Id == trip.Id)))
            .Should().BeTrue();
        var rows = await WithDbContextAsync(db => db.Finance.AsNoTracking().ToListAsync());
        rows.Should().HaveCount(2);
        rows.Should().Contain(finance => finance.Id == first.Id);
        rows.Should().Contain(finance => finance.Id == second.Id);
    }

    [Fact]
    public async Task Delete_trip_rolls_back_finance_deletion_when_saving_fails()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);
        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var row = TestFinance("expense", 10m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        await SeedAsync(row);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .AddInterceptors(new ConcurrencyFailureInterceptor())
            .Options;

        await using var db = new AppDbContext(options);
        var controller = new TripsController(db);
        var response = await controller.Delete(
            trip.Id,
            new FinanceVersionReferencesRequest
            {
                Transactions = [Version(row)]
            },
            CancellationToken.None);

        response.Should().BeOfType<ConflictObjectResult>();
        (await WithDbContextAsync(context => context.Trips
                .AnyAsync(candidate => candidate.Id == trip.Id)))
            .Should().BeTrue();
        var rows = await WithDbContextAsync(context => context.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle(finance => finance.Id == row.Id && finance.Amount == 10m);
    }

    [Fact]
    public async Task Generic_finance_writes_reject_trip_transactions_atomically()
    {
        var nina = TestUser();
        var season = TestSeason();
        var game = TestGame(season, nina);
        await SeedAsync(nina, season, game);
        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var tripRow = TestFinance(
            "expense",
            10m,
            "TRIP",
            trip.OccurredAt,
            nina,
            season.Id,
            game,
            trip);
        var ordinaryRow = TestFinance(
            "expense",
            5m,
            "OTHER",
            user: nina,
            seasonId: season.Id,
            game: game);
        await SeedAsync(tripRow, ordinaryRow);

        var createResponse = await Client.PostAsJsonAsync("/api/finance", new
        {
            direction = "expense",
            amount = 1m,
            category = "TRIP"
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var updateResponse = await Client.PutAsJsonAsync($"/api/finance/{tripRow.Id}", new
        {
            updatedAt = tripRow.UpdatedAt,
            occurredAt = tripRow.OccurredAt,
            direction = tripRow.Direction,
            amount = tripRow.Amount,
            category = tripRow.Category,
            userId = tripRow.UserId,
            seasonId = tripRow.SeasonId
        });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var singleDeleteResponse = await Client.DeleteAsync(
            $"/api/finance/{tripRow.Id}?updatedAt={Uri.EscapeDataString(tripRow.UpdatedAt.ToString("O"))}");
        singleDeleteResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var bulkResponse = await Client.PostAsJsonAsync("/api/finance/bulk-delete", new
        {
            transactions = new[] { Version(tripRow), Version(ordinaryRow) }
        });
        bulkResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var gameDeleteRequest = new HttpRequestMessage(
            HttpMethod.Delete,
            $"/api/finance/by-game/{game.Id}")
        {
            Content = JsonContent.Create(new
            {
                transactions = new[] { Version(tripRow), Version(ordinaryRow) }
            })
        };
        var gameDeleteResponse = await Client.SendAsync(gameDeleteRequest);
        gameDeleteResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var remainingIds = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .Select(finance => finance.Id)
            .ToListAsync());
        remainingIds.Should().Contain(new[] { tripRow.Id, ordinaryRow.Id });
    }

    [Fact]
    public async Task Replace_trip_split_removes_old_trip_rows_and_creates_split_replacements()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var oldTripOne = TestFinance("expense", 1m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        var oldTripTwo = TestFinance("expense", 2m, "TRIP", trip.OccurredAt, alex, season.Id, trip: trip);
        await SeedAsync(oldTripOne, oldTripTwo);

        var response = await Client.PutAsJsonAsync($"/api/trips/{trip.Id}/splits", new
        {
            transactions = new[] { Version(oldTripOne), Version(oldTripTwo) },
            direction = "expense",
            amount = 10.00m,
            description = "Urlaub (Ausgabe: Neu)",
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
        createdRows.Should().OnlyContain(x => x.TripId == trip.Id);
        createdRows.Should().OnlyContain(x => x.OccurredAt == trip.OccurredAt);
        createdRows.Should().OnlyContain(x => x.SeasonId == season.Id);

        var remaining = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .ToListAsync());

        remaining.Should().HaveCount(2);
        remaining.Should().NotContain(x => x.Id == oldTripOne.Id || x.Id == oldTripTwo.Id);
        remaining.Sum(x => x.Amount).Should().Be(10.00m);
        remaining.Should().OnlyContain(x => x.TripId == trip.Id);
    }

    [Fact]
    public async Task Replace_trip_split_rejects_incomplete_stale_duplicate_and_mixed_group_references()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);

        var first = TestFinance("expense", 5m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        first.Description = "Urlaub (Aktivität: Museum)";
        var second = TestFinance("expense", 5m, "TRIP", trip.OccurredAt, alex, season.Id, trip: trip);
        second.Description = first.Description;
        var otherGroup = TestFinance("expense", 2m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        otherGroup.Description = "Urlaub (Ausgabe: Essen)";
        await SeedAsync(first, second, otherGroup);
        var otherTrip = new Trip
        {
            OccurredAt = trip.OccurredAt,
            Name = "Anderer Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(otherTrip);
        var otherTripRow = TestFinance(
            "expense",
            3m,
            "TRIP",
            otherTrip.OccurredAt,
            nina,
            season.Id,
            trip: otherTrip);
        await SeedAsync(otherTripRow);

        async Task<HttpResponseMessage> Replace(IEnumerable<object> transactions)
        {
            return await Client.PutAsJsonAsync($"/api/trips/{trip.Id}/splits", new
            {
                transactions,
                direction = "expense",
                amount = 12m,
                description = "Urlaub (Aktivität: Neu)",
                userIds = new[] { nina.Id, alex.Id }
            });
        }

        var incompleteResponse = await Replace([Version(first)]);
        var staleResponse = await Replace(
        [
            new
            {
                id = first.Id,
                updatedAt = first.UpdatedAt.AddTicks(-10)
            },
            Version(second)
        ]);
        var duplicateResponse = await Replace([Version(first), Version(first)]);
        var mixedGroupResponse = await Replace([Version(first), Version(otherGroup)]);
        var crossTripResponse = await Replace([Version(otherTripRow)]);
        var missingResponse = await Replace(
        [
            new
            {
                id = otherGroup.Id + 999,
                updatedAt = otherGroup.UpdatedAt
            }
        ]);

        incompleteResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        staleResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mixedGroupResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        crossTripResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        missingResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().HaveCount(4);
        rows.Should().Contain(finance => finance.Id == first.Id && finance.Amount == 5m);
        rows.Should().Contain(finance => finance.Id == second.Id && finance.Amount == 5m);
        rows.Should().Contain(finance => finance.Id == otherGroup.Id && finance.Amount == 2m);
        rows.Should().Contain(finance => finance.Id == otherTripRow.Id && finance.Amount == 3m);
    }

    [Fact]
    public async Task Replace_trip_splits_batch_replaces_base_and_additional_bookings_together()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
        var trip = new Trip { OccurredAt = occurredAt, Name = "Urlaub", SeasonId = season.Id };
        await SeedAsync(trip);
        var baseOne = TestFinance("expense", 5m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        baseOne.Description = "Urlaub (Anreise/Unterkunft)";
        var baseTwo = TestFinance("expense", 5m, "TRIP", occurredAt, alex, season.Id, trip: trip);
        baseTwo.Description = "Urlaub (Anreise/Unterkunft)";
        var activityOne = TestFinance("expense", 2m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        activityOne.Description = "Urlaub (Aktivität)";
        var activityTwo = TestFinance("expense", 2m, "TRIP", occurredAt, alex, season.Id, trip: trip);
        activityTwo.Description = "Urlaub (Aktivität)";
        await SeedAsync(baseOne, baseTwo, activityOne, activityTwo);

        var response = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id, alex.Id },
                splits = new object[]
                {
                    new
                    {
                        transactions = new[] { Version(baseOne), Version(baseTwo) },
                        direction = "expense",
                        amount = 12m,
                        description = "Urlaub (Anreise/Unterkunft)"
                    },
                    new
                    {
                        transactions = new[] { Version(activityOne), Version(activityTwo) },
                        direction = "income",
                        amount = 3m,
                        description = "Urlaub (Aktivität)"
                    },
                    new
                    {
                        transactions = Array.Empty<FinanceVersionReference>(),
                        direction = "expense",
                        amount = 2m,
                        description = "Urlaub (Neue Aktivität)"
                    }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<List<FinanceDto>>();
        var createdRows = created!;
        createdRows.Should().HaveCount(6);
        createdRows.Should().OnlyContain(finance =>
            finance.Category == "TRIP" &&
            finance.OccurredAt == occurredAt &&
            finance.SeasonId == season.Id);
        createdRows.Where(finance => finance.Direction == "expense")
            .Sum(finance => finance.Amount).Should().Be(14m);
        createdRows.Where(finance => finance.Direction == "income")
            .Sum(finance => finance.Amount).Should().Be(3m);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().HaveCount(6);
        rows.Should().NotContain(finance =>
            finance.Id == baseOne.Id ||
            finance.Id == baseTwo.Id ||
            finance.Id == activityOne.Id ||
            finance.Id == activityTwo.Id);
    }

    [Fact]
    public async Task Replace_trip_splits_batch_rejects_a_later_invalid_split_without_changes()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
        var trip = new Trip { OccurredAt = occurredAt, Name = "Urlaub", SeasonId = season.Id };
        await SeedAsync(trip);
        var baseRow = TestFinance("expense", 10m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        var activityRow = TestFinance("expense", 4m, "TRIP", occurredAt, alex, season.Id, trip: trip);
        await SeedAsync(baseRow, activityRow);

        var response = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id, alex.Id },
                splits = new object[]
                {
                    new
                    {
                        transactions = new[] { Version(baseRow) },
                        direction = "expense",
                        amount = 12m
                    },
                    new
                    {
                        transactions = new[] { Version(activityRow) },
                        direction = "expense",
                        amount = 0.01m
                    }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().HaveCount(2);
        rows.Should().Contain(finance => finance.Id == baseRow.Id && finance.Amount == 10m);
        rows.Should().Contain(finance => finance.Id == activityRow.Id && finance.Amount == 4m);
    }

    [Fact]
    public async Task Replace_trip_splits_batch_rejects_stale_duplicate_and_cross_trip_references()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
        var otherOccurredAt = occurredAt.AddHours(1);
        var trip = new Trip { OccurredAt = occurredAt, Name = "Current", SeasonId = season.Id };
        var otherTrip = new Trip { OccurredAt = otherOccurredAt, Name = "Other", SeasonId = season.Id };
        await SeedAsync(trip, otherTrip);
        var currentRow = TestFinance("expense", 10m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        var currentSibling = TestFinance("expense", 3m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        var otherTripRow = TestFinance("expense", 5m, "TRIP", otherOccurredAt, nina, season.Id, trip: otherTrip);
        await SeedAsync(currentRow, currentSibling, otherTripRow);

        object Split(object[] transactions) => new
        {
            transactions,
            direction = "expense",
            amount = 12m
        };

        var staleResponse = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id },
                splits = new[]
                {
                    Split(
                    [
                        new
                        {
                            id = currentRow.Id,
                            updatedAt = currentRow.UpdatedAt.AddTicks(-10)
                        }
                    ])
                }
            });

        var incompleteResponse = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id },
                splits = new[] { Split([Version(currentRow)]) }
            });

        var duplicateReference = Version(currentRow);
        var duplicateResponse = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id },
                splits = new[]
                {
                    Split([duplicateReference]),
                    Split([duplicateReference])
                }
            });

        var crossTripResponse = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id },
                splits = new[] { Split([Version(otherTripRow)]) }
            });

        var missingResponse = await Client.PutAsJsonAsync(
            $"/api/trips/{trip.Id}/splits/batch",
            new
            {
                userIds = new[] { nina.Id },
                splits = new[]
                {
                    Split(
                    [
                        new
                        {
                            id = otherTripRow.Id + 999,
                            updatedAt = otherTripRow.UpdatedAt
                        }
                    ])
                }
            });

        staleResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        incompleteResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        crossTripResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        missingResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .OrderBy(finance => finance.Id)
            .ToListAsync());
        rows.Should().HaveCount(3);
        rows.Should().Contain(finance => finance.Id == currentRow.Id && finance.Amount == 10m);
        rows.Should().Contain(finance => finance.Id == currentSibling.Id && finance.Amount == 3m);
        rows.Should().Contain(finance => finance.Id == otherTripRow.Id && finance.Amount == 5m);
    }

    [Fact]
    public async Task Replace_trip_splits_batch_rolls_back_when_rows_change_during_save()
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);

        var occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
        var trip = new Trip { OccurredAt = occurredAt, Name = "Urlaub", SeasonId = season.Id };
        await SeedAsync(trip);
        var oldTrip = TestFinance("expense", 10m, "TRIP", occurredAt, nina, season.Id, trip: trip);
        await SeedAsync(oldTrip);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .AddInterceptors(new ConcurrencyFailureInterceptor())
            .Options;

        await using var db = new AppDbContext(options);
        var controller = new TripsController(db);
        var response = await controller.ReplaceSplitsBatch(
            trip.Id,
            new ReplaceTripSplitsByIdRequest
            {
                UserIds = [nina.Id],
                Splits =
                [
                    new TripSplitByIdBatchEntryRequest
                    {
                        Transactions = [Version(oldTrip)],
                        Direction = "expense",
                        Amount = 12m,
                        Description = "Urlaub (Anreise/Unterkunft)"
                    }
                ]
            },
            CancellationToken.None);

        response.Result.Should().BeOfType<ConflictObjectResult>();
        var rows = await WithDbContextAsync(context => context.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle(finance =>
            finance.Id == oldTrip.Id && finance.Amount == 10m);
    }

    [Theory]
    [InlineData("add")]
    [InlineData("replace")]
    [InlineData("batch")]
    [InlineData("delete")]
    public async Task Trip_mutations_take_an_aggregate_row_lock(string mutation)
    {
        var nina = TestUser();
        var season = TestSeason();
        await SeedAsync(nina, season);
        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var existing = TestFinance(
            "expense",
            10m,
            "TRIP",
            trip.OccurredAt,
            nina,
            season.Id,
            trip: trip);
        existing.Description = "Urlaub (Anreise/Unterkunft)";
        await SeedAsync(existing);

        var connectionString = await WithDbContextAsync(db =>
            Task.FromResult(db.Database.GetConnectionString()));
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString!)
            .Options;

        await using var blocker = new AppDbContext(options);
        await blocker.Database.OpenConnectionAsync();
        await using var blockerTransaction = await blocker.Database.BeginTransactionAsync();
        await blocker.Trips
            .FromSqlInterpolated($"SELECT * FROM trip WHERE id = {trip.Id} FOR UPDATE")
            .SingleAsync();

        await using var contender = new AppDbContext(options);
        await contender.Database.OpenConnectionAsync();
        await contender.Database.ExecuteSqlRawAsync("SET lock_timeout = '100ms'");
        var controller = new TripsController(contender);

        async Task InvokeMutation()
        {
            switch (mutation)
            {
                case "add":
                    await controller.AddSplit(
                        trip.Id,
                        new TripSplitRequest
                        {
                            Direction = "expense",
                            Amount = 10m,
                            UserIds = [nina.Id]
                        },
                        CancellationToken.None);
                    break;
                case "replace":
                    await controller.ReplaceSplit(
                        trip.Id,
                        new ReplaceTripSplitByIdRequest
                        {
                            Transactions = [Version(existing)],
                            Direction = "expense",
                            Amount = 12m,
                            UserIds = [nina.Id]
                        },
                        CancellationToken.None);
                    break;
                case "batch":
                    await controller.ReplaceSplitsBatch(
                        trip.Id,
                        new ReplaceTripSplitsByIdRequest
                        {
                            UserIds = [nina.Id],
                            Splits =
                            [
                                new TripSplitByIdBatchEntryRequest
                                {
                                    Transactions = [Version(existing)],
                                    Direction = "expense",
                                    Amount = 12m
                                }
                            ]
                        },
                        CancellationToken.None);
                    break;
                case "delete":
                    await controller.Delete(
                        trip.Id,
                        new FinanceVersionReferencesRequest
                        {
                            Transactions = [Version(existing)]
                        },
                        CancellationToken.None);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(mutation));
            }
        }

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(InvokeMutation);

        exception.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.LockNotAvailable);
        await blockerTransaction.RollbackAsync();

        var rows = await WithDbContextAsync(db => db.Finance
            .AsNoTracking()
            .ToListAsync());
        rows.Should().ContainSingle(finance =>
            finance.Id == existing.Id && finance.Amount == 10m);
        (await WithDbContextAsync(db => db.Trips.AnyAsync(candidate => candidate.Id == trip.Id)))
            .Should().BeTrue();
    }

    [Fact]
    public async Task Trip_split_rejects_amounts_that_cannot_give_every_user_one_cent()
    {
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var season = TestSeason();
        await SeedAsync(nina, alex, season);

        var createResponse = await Client.PostAsJsonAsync("/api/trips", new
        {
            occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            name = "Urlaub",
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

        var trip = new Trip
        {
            OccurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc),
            Name = "Urlaub",
            SeasonId = season.Id
        };
        await SeedAsync(trip);
        var oldTripOne = TestFinance("expense", 1m, "TRIP", trip.OccurredAt, nina, season.Id, trip: trip);
        var oldTripTwo = TestFinance("expense", 2m, "TRIP", trip.OccurredAt, alex, season.Id, trip: trip);
        await SeedAsync(oldTripOne, oldTripTwo);

        var replaceResponse = await Client.PutAsJsonAsync($"/api/trips/{trip.Id}/splits", new
        {
            transactions = new[] { Version(oldTripOne), Version(oldTripTwo) },
            direction = "expense",
            amount = 0.01m,
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

        var occurredAt = new DateTime(2026, 6, 16, 12, 0, 0, DateTimeKind.Utc);
        var validTripFields = new
        {
            occurredAt,
            name = "Urlaub",
            seasonId = season.Id
        };

        var invalidAmount = await Client.PostAsJsonAsync("/api/trips", new
        {
            validTripFields.occurredAt,
            validTripFields.name,
            validTripFields.seasonId,
            direction = "expense",
            amount = 10.001m,
            userIds = new[] { nina.Id }
        });

        var emptyUsers = await Client.PostAsJsonAsync("/api/trips", new
        {
            validTripFields.occurredAt,
            validTripFields.name,
            validTripFields.seasonId,
            direction = "expense",
            amount = 10.00m,
            userIds = Array.Empty<long>()
        });

        var missingUser = await Client.PostAsJsonAsync("/api/trips", new
        {
            validTripFields.occurredAt,
            validTripFields.name,
            validTripFields.seasonId,
            direction = "expense",
            amount = 10.00m,
            userIds = new[] { nina.Id + 999 }
        });

        var invalidSeason = await Client.PostAsJsonAsync("/api/trips", new
        {
            occurredAt,
            name = "Urlaub",
            direction = "expense",
            amount = 10.00m,
            seasonId = season.Id + 999,
            userIds = new[] { nina.Id }
        });

        var nonTrip = TestFinance("expense", 10m, "PIZZA", user: nina, seasonId: season.Id);
        await SeedAsync(nonTrip);
        var trip = new Trip { OccurredAt = occurredAt, Name = "Urlaub", SeasonId = season.Id };
        await SeedAsync(trip);

        var nonTripReplace = await Client.PutAsJsonAsync($"/api/trips/{trip.Id}/splits", new
        {
            transactions = new[] { Version(nonTrip) },
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
        public override ValueTask<int> SavedChangesAsync(
            SaveChangesCompletedEventData eventData,
            int result,
            CancellationToken cancellationToken = default)
        {
            return ValueTask.FromException<int>(
                new DbUpdateConcurrencyException());
        }
    }

    private static FinanceVersionReference Version(Finance finance) => new()
    {
        Id = finance.Id,
        UpdatedAt = finance.UpdatedAt
    };

    private static FinanceVersionReference Version(FinanceDto finance) => new()
    {
        Id = finance.Id,
        UpdatedAt = finance.UpdatedAt
    };
}
