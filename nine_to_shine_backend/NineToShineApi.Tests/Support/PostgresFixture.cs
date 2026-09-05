using Npgsql;
using Testcontainers.PostgreSql;

namespace NineToShineApi.Tests.Support;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer? _container;
    private readonly string? _bootstrapConnectionString;
    private string? _ownedExternalDatabaseName;

    public PostgresFixture()
        : this(Environment.GetEnvironmentVariable("NTS_TEST_CONNECTION_STRING"))
    {
    }

    internal PostgresFixture(string? connectionString)
    {
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            // External configuration is a bootstrap connection only. Tests never migrate or
            // delete its database; they create and own a separate database for this test run.
            _bootstrapConnectionString = connectionString;
            return;
        }

        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("nine_to_shine_tests")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public TestDatabaseLease Lease { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        if (_container is not null)
        {
            await _container.StartAsync();
            Lease = TestDatabaseLease.Create(_container.GetConnectionString());
            return;
        }

        var bootstrap = TestDatabaseSafety.ParseConnectionString(_bootstrapConnectionString!);
        bootstrap.Pooling = false;

        var databaseName = TestDatabaseSafety.CreateRunDatabaseName();
        await using (var connection = new NpgsqlConnection(bootstrap.ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"CREATE DATABASE {QuoteIdentifier(databaseName)}";
            await command.ExecuteNonQueryAsync();
        }

        _ownedExternalDatabaseName = databaseName;

        var testDatabase = new NpgsqlConnectionStringBuilder(bootstrap.ConnectionString)
        {
            Database = databaseName,
            Pooling = false
        };

        Lease = TestDatabaseLease.Create(testDatabase.ConnectionString);
    }

    public async Task DisposeAsync()
    {
        if (_container is not null)
        {
            await _container.DisposeAsync();
            return;
        }

        if (_ownedExternalDatabaseName is null)
            return;

        TestDatabaseSafety.EnsureResetIsAllowed(
            _ownedExternalDatabaseName,
            _ownedExternalDatabaseName);

        var bootstrap = TestDatabaseSafety.ParseConnectionString(_bootstrapConnectionString!);
        bootstrap.Pooling = false;

        await using var connection = new NpgsqlConnection(bootstrap.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"DROP DATABASE IF EXISTS {QuoteIdentifier(_ownedExternalDatabaseName)}";
        await command.ExecuteNonQueryAsync();
    }

    private static string QuoteIdentifier(string identifier)
    {
        return new NpgsqlCommandBuilder().QuoteIdentifier(identifier);
    }

    public sealed class TestDatabaseLease
    {
        private TestDatabaseLease(string connectionString, string databaseName)
        {
            ConnectionString = connectionString;
            DatabaseName = databaseName;
        }

        internal string ConnectionString { get; }
        internal string DatabaseName { get; }

        private static TestDatabaseLease CreateCore(string connectionString)
        {
            var builder = TestDatabaseSafety.ParseConnectionString(connectionString);
            var databaseName = builder.Database!;
            TestDatabaseSafety.EnsureResetIsAllowed(databaseName, databaseName);
            return new TestDatabaseLease(connectionString, databaseName);
        }

        internal static TestDatabaseLease Create(string connectionString) => CreateCore(connectionString);
    }
}
