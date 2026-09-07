using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Tests.Support;
using Npgsql;

namespace NineToShineApi.Tests;

public sealed class MigrationUpgradeTests : IntegrationTestBase
{
    private const string BeforeOrganizerRotation = "20251217113609_RemovePenaltyTable";
    private const string BeforeFinanceConcurrency = "20260522090629_AddOrganizerRotation";

    public MigrationUpgradeTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Organizer_rotation_migration_preserves_duties_and_backfills_members()
    {
        await Factory.ResetDatabaseAsync(BeforeOrganizerRotation);

        await WithDbContextAsync(async db =>
        {
            var appliedMigrations = await db.Database.GetAppliedMigrationsAsync();
            appliedMigrations.Last().Should().Be(BeforeOrganizerRotation);

            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO season (id, season_number)
                VALUES (920001, 820001), (920002, 820002);

                INSERT INTO users (id, display_name, email)
                VALUES
                    (921001, 'Nina', 'migration-nina@example.test'),
                    (921002, 'Alex', 'migration-alex@example.test'),
                    (921003, 'Bea', 'migration-bea@example.test'),
                    (921004, 'Chris', 'migration-chris@example.test'),
                    (921005, 'Diana', 'migration-diana@example.test');

                INSERT INTO organizer_duty (id, duty_date, user_id, season_id)
                VALUES
                    (922001, '2026-01-10',
                     (SELECT id FROM users WHERE email = 'migration-nina@example.test'),
                     (SELECT id FROM season WHERE season_number = 820001)),
                    (922002, '2026-01-05',
                     (SELECT id FROM users WHERE email = 'migration-alex@example.test'),
                     (SELECT id FROM season WHERE season_number = 820001)),
                    (922003, '2026-02-07',
                     (SELECT id FROM users WHERE email = 'migration-alex@example.test'),
                     (SELECT id FROM season WHERE season_number = 820001)),
                    (922004, '2026-01-03',
                     (SELECT id FROM users WHERE email = 'migration-bea@example.test'),
                     (SELECT id FROM season WHERE season_number = 820002)),
                    (922005, '2026-01-03',
                     (SELECT id FROM users WHERE email = 'migration-chris@example.test'),
                     (SELECT id FROM season WHERE season_number = 820002));
                """);

            await db.GetService<IMigrator>().MigrateAsync();
            db.ChangeTracker.Clear();

            var duties = await db.OrganizerDuties
                .AsNoTracking()
                .OrderBy(duty => duty.SeasonId)
                .ThenBy(duty => duty.DutyDate)
                .ThenBy(duty => duty.UserId)
                .Select(duty => new
                {
                    duty.Id,
                    duty.DutyDate,
                    duty.UserId,
                    duty.SeasonId,
                    duty.IsSkipped,
                    duty.IsManualOverride
                })
                .ToListAsync();
            duties.Should().BeEquivalentTo(
                [
                    new
                    {
                        Id = 922002L,
                        DutyDate = new DateTime(2026, 1, 5),
                        UserId = 921002L,
                        SeasonId = 920001L,
                        IsSkipped = false,
                        IsManualOverride = false
                    },
                    new
                    {
                        Id = 922001L,
                        DutyDate = new DateTime(2026, 1, 10),
                        UserId = 921001L,
                        SeasonId = 920001L,
                        IsSkipped = false,
                        IsManualOverride = false
                    },
                    new
                    {
                        Id = 922003L,
                        DutyDate = new DateTime(2026, 2, 7),
                        UserId = 921002L,
                        SeasonId = 920001L,
                        IsSkipped = false,
                        IsManualOverride = false
                    },
                    new
                    {
                        Id = 922004L,
                        DutyDate = new DateTime(2026, 1, 3),
                        UserId = 921003L,
                        SeasonId = 920002L,
                        IsSkipped = false,
                        IsManualOverride = false
                    },
                    new
                    {
                        Id = 922005L,
                        DutyDate = new DateTime(2026, 1, 3),
                        UserId = 921004L,
                        SeasonId = 920002L,
                        IsSkipped = false,
                        IsManualOverride = false
                    }
                ],
                options => options.WithStrictOrdering());

            var rotation = await db.OrganizerRotationMembers
                .AsNoTracking()
                .OrderBy(member => member.SeasonId)
                .ThenBy(member => member.SortOrder)
                .Select(member => new
                {
                    member.SeasonId,
                    member.UserId,
                    SeasonNumber = member.Season.SeasonNumber,
                    UserName = member.User.DisplayName,
                    member.SortOrder
                })
                .ToListAsync();

            rotation.Should().BeEquivalentTo(
                [
                    new
                    {
                        SeasonId = 920001L,
                        UserId = 921002L,
                        SeasonNumber = 820001,
                        UserName = "Alex",
                        SortOrder = 1
                    },
                    new
                    {
                        SeasonId = 920001L,
                        UserId = 921001L,
                        SeasonNumber = 820001,
                        UserName = "Nina",
                        SortOrder = 2
                    },
                    new
                    {
                        SeasonId = 920002L,
                        UserId = 921003L,
                        SeasonNumber = 820002,
                        UserName = "Bea",
                        SortOrder = 1
                    },
                    new
                    {
                        SeasonId = 920002L,
                        UserId = 921004L,
                        SeasonNumber = 820002,
                        UserName = "Chris",
                        SortOrder = 2
                    }
                ],
                options => options.WithStrictOrdering());

            var duplicateMember = async () => await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO organizer_rotation_member (season_id, user_id, sort_order)
                VALUES (
                    (SELECT id FROM season WHERE season_number = 820001),
                    (SELECT id FROM users WHERE email = 'migration-nina@example.test'),
                    3);
                """);

            var exception = await duplicateMember.Should().ThrowAsync<PostgresException>();
            exception.Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);

            var duplicateSortOrder = async () => await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO organizer_rotation_member (season_id, user_id, sort_order)
                VALUES (
                    (SELECT id FROM season WHERE season_number = 820001),
                    (SELECT id FROM users WHERE email = 'migration-diana@example.test'),
                    1);
                """);

            exception = await duplicateSortOrder.Should().ThrowAsync<PostgresException>();
            exception.Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);

            return true;
        });
    }

    [Fact]
    public async Task Finance_concurrency_migration_preserves_rows_and_enforces_versions()
    {
        await Factory.ResetDatabaseAsync(BeforeFinanceConcurrency);

        await WithDbContextAsync(async db =>
        {
            var appliedMigrations = await db.Database.GetAppliedMigrationsAsync();
            appliedMigrations.Last().Should().Be(BeforeFinanceConcurrency);

            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO season (id, season_number) VALUES (930001, 830001);

                INSERT INTO users (id, display_name, email)
                VALUES (931001, 'Mara', 'migration-mara@example.test');

                INSERT INTO finance
                    ("Id", occurred_at, direction, amount, category, "Description", user_id, season_id)
                VALUES
                    (932001, '2026-03-01T10:15:00Z', 'income', 42.50, 'DEPOSIT', 'Legacy deposit',
                     (SELECT id FROM users WHERE email = 'migration-mara@example.test'),
                     (SELECT id FROM season WHERE season_number = 830001)),
                    (932002, '2026-03-02T11:30:00Z', 'expense', 7.25, 'OTHER', NULL, NULL, NULL);
                """);

            await db.GetService<IMigrator>().MigrateAsync();
            db.ChangeTracker.Clear();

            var legacyRows = await db.Finance
                .AsNoTracking()
                .OrderBy(finance => finance.OccurredAt)
                .ToListAsync();
            legacyRows.Should().OnlyContain(finance => finance.UpdatedAt != default);
            legacyRows.Select(finance => new
                {
                    finance.Id,
                    finance.OccurredAt,
                    finance.Direction,
                    finance.Amount,
                    finance.Category,
                    finance.Description,
                    finance.UserId,
                    finance.SeasonId,
                    finance.GameId,
                    finance.TripId
                })
                .Should().BeEquivalentTo(
                    [
                        new
                        {
                            Id = 932001L,
                            OccurredAt = new DateTime(2026, 3, 1, 10, 15, 0, DateTimeKind.Utc),
                            Direction = "income",
                            Amount = 42.50m,
                            Category = "DEPOSIT",
                            Description = (string?)"Legacy deposit",
                            UserId = (long?)931001L,
                            SeasonId = (long?)930001L,
                            GameId = (long?)null,
                            TripId = (long?)null
                        },
                        new
                        {
                            Id = 932002L,
                            OccurredAt = new DateTime(2026, 3, 2, 11, 30, 0, DateTimeKind.Utc),
                            Direction = "expense",
                            Amount = 7.25m,
                            Category = "OTHER",
                            Description = (string?)null,
                            UserId = (long?)null,
                            SeasonId = (long?)null,
                            GameId = (long?)null,
                            TripId = (long?)null
                        }
                    ],
                    options => options.WithStrictOrdering());

            var originalVersion = legacyRows[0].UpdatedAt;
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE finance
                SET amount = 43.50
                WHERE "Id" = {legacyRows[0].Id};
                """);

            var updatedRow = await db.Finance
                .AsNoTracking()
                .SingleAsync(finance => finance.Id == legacyRows[0].Id);
            updatedRow.Amount.Should().Be(43.50m);
            updatedRow.UpdatedAt.Should().BeAfter(originalVersion);

            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO finance
                    (occurred_at, direction, amount, category, "Description")
                VALUES ('2026-03-03T12:45:00Z', 'income', 1.00, 'OTHER', 'Uses default version');
                """);
            var defaultedVersion = await db.Finance
                .AsNoTracking()
                .Where(finance => finance.Description == "Uses default version")
                .Select(finance => finance.UpdatedAt)
                .SingleAsync();
            defaultedVersion.Should().NotBe(default);

            var nullVersionInsert = async () => await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO finance
                    (occurred_at, direction, amount, category, "Description", updated_at)
                VALUES ('2026-03-04T13:00:00Z', 'income', 1.00, 'OTHER', 'Invalid version', NULL);
                """);

            var exception = await nullVersionInsert.Should().ThrowAsync<PostgresException>();
            exception.Which.SqlState.Should().Be(PostgresErrorCodes.NotNullViolation);

            return true;
        });
    }
}
