using FluentAssertions;
using Npgsql;
using Testcontainers.PostgreSql;

namespace NineToShineApi.Tests.Support;

public sealed class PostgresFixtureTests
{
    [Fact]
    public async Task External_connection_creates_uses_and_removes_an_isolated_database()
    {
        await using var bootstrapContainer = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("fixture_bootstrap")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
        await bootstrapContainer.StartAsync();

        var bootstrapConnectionString = bootstrapContainer.GetConnectionString();
        var fixture = new PostgresFixture(bootstrapConnectionString);
        NineToShineApiFactory? factory = null;
        string? leasedDatabaseName = null;

        try
        {
            await fixture.InitializeAsync();
            leasedDatabaseName = fixture.Lease.DatabaseName;
            leasedDatabaseName.Should().StartWith(TestDatabaseSafety.RunDatabasePrefix);
            leasedDatabaseName.Should().NotBe("fixture_bootstrap");

            factory = new NineToShineApiFactory(fixture.Lease);
            _ = factory.Server;

            (await HasMigrationHistoryAsync(fixture.Lease.ConnectionString)).Should().BeFalse();

            await factory.ResetDatabaseAsync();

            (await HasMigrationHistoryAsync(fixture.Lease.ConnectionString)).Should().BeTrue();
            (await HasMigrationHistoryAsync(bootstrapConnectionString)).Should().BeFalse();
        }
        finally
        {
            factory?.Dispose();
            await fixture.DisposeAsync();
        }

        (await DatabaseExistsAsync(bootstrapConnectionString, leasedDatabaseName!)).Should().BeFalse();
        (await DatabaseExistsAsync(bootstrapConnectionString, "fixture_bootstrap")).Should().BeTrue();
    }

    private static async Task<bool> HasMigrationHistoryAsync(string connectionString)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = '__EFMigrationsHistory'
            )
            """;
        return (bool)(await command.ExecuteScalarAsync())!;
    }

    private static async Task<bool> DatabaseExistsAsync(string connectionString, string databaseName)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = @databaseName)";
        command.Parameters.AddWithValue("databaseName", databaseName);
        return (bool)(await command.ExecuteScalarAsync())!;
    }
}
