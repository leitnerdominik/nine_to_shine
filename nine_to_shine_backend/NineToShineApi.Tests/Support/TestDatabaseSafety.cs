using Npgsql;

namespace NineToShineApi.Tests.Support;

internal static class TestDatabaseSafety
{
    internal const string ContainerDatabaseName = "nine_to_shine_tests";
    internal const string RunDatabasePrefix = "nine_to_shine_tests_";

    internal static NpgsqlConnectionStringBuilder ParseConnectionString(string connectionString)
    {
        NpgsqlConnectionStringBuilder builder;

        try
        {
            builder = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException("The PostgreSQL test connection string is invalid.");
        }

        if (string.IsNullOrWhiteSpace(builder.Database))
            throw new InvalidOperationException("The PostgreSQL test connection string must specify a database.");

        return builder;
    }

    internal static string CreateRunDatabaseName()
    {
        return $"{RunDatabasePrefix}{Guid.NewGuid():N}";
    }

    internal static void EnsureResetIsAllowed(string expectedDatabaseName, string actualDatabaseName)
    {
        if (!IsOwnedTestDatabaseName(expectedDatabaseName))
        {
            throw new InvalidOperationException(
                $"Refusing to reset database '{expectedDatabaseName}' because it is not an owned test database.");
        }

        if (!string.Equals(expectedDatabaseName, actualDatabaseName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Refusing to reset database '{actualDatabaseName}' because the test fixture owns " +
                $"'{expectedDatabaseName}'.");
        }
    }

    private static bool IsOwnedTestDatabaseName(string databaseName)
    {
        if (string.Equals(databaseName, ContainerDatabaseName, StringComparison.Ordinal))
            return true;

        if (!databaseName.StartsWith(RunDatabasePrefix, StringComparison.Ordinal))
            return false;

        var runId = databaseName[RunDatabasePrefix.Length..];
        return Guid.TryParseExact(runId, "N", out _);
    }
}
