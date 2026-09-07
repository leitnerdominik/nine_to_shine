using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class TripMigrationTests : IntegrationTestBase
{
    public TripMigrationTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Stable_trip_id_migration_backfills_legacy_timestamp_groups()
    {
        await Factory.ResetDatabaseAsync("20260813120000_AddFinanceUpdatedAtConcurrency");

        await WithDbContextAsync(async db =>
        {
            var migrator = db.GetService<IMigrator>();
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO season (season_number) VALUES (810001);

                INSERT INTO finance
                    (occurred_at, direction, amount, category, "Description", season_id)
                VALUES
                    ('2026-06-15T12:00:00Z', 'expense', 5.00, 'TRIP',
                     'Ignored activity title (Aktivität: Museum)',
                     (SELECT id FROM season WHERE season_number = 810001)),
                    ('2026-06-15T12:00:00Z', 'expense', 10.00, 'TRIP',
                     repeat('L', 250) || ' (Anreise/Unterkunft)',
                     (SELECT id FROM season WHERE season_number = 810001)),
                    ('2026-06-15T18:00:00Z', 'expense', 8.00, 'TRIP',
                     'Evening trip (Anreise/Unterkunft)',
                     (SELECT id FROM season WHERE season_number = 810001));
                """);

            await migrator.MigrateAsync();
            db.ChangeTracker.Clear();

            var trips = await db.Trips.AsNoTracking().ToListAsync();
            trips.Should().HaveCount(2);
            var middayTrip = trips.Single(trip => trip.OccurredAt.Hour == 12);
            var eveningTrip = trips.Single(trip => trip.OccurredAt.Hour == 18);
            middayTrip.Name.Should().Be(new string('L', 200));
            middayTrip.SeasonId.Should().NotBeNull();
            eveningTrip.Name.Should().Be("Evening trip");
            eveningTrip.SeasonId.Should().NotBeNull();

            var financeRows = await db.Finance.AsNoTracking().ToListAsync();
            financeRows.Should().HaveCount(3);
            financeRows.Where(finance => finance.OccurredAt.Hour == 12)
                .Should().OnlyContain(finance => finance.TripId == middayTrip.Id);
            financeRows.Where(finance => finance.OccurredAt.Hour == 18)
                .Should().OnlyContain(finance => finance.TripId == eveningTrip.Id);

            return true;
        });
    }
}
