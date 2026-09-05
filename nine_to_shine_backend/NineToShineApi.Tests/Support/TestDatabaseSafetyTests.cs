using FluentAssertions;

namespace NineToShineApi.Tests.Support;

public sealed class TestDatabaseSafetyTests
{
    [Theory]
    [InlineData("nine_to_shine")]
    [InlineData("production")]
    [InlineData("nine_to_shine_test")]
    [InlineData("nine_to_shine_tests_")]
    [InlineData("nine_to_shine_tests_staging")]
    [InlineData("nine_to_shine_tests_prod")]
    public void Reset_rejects_database_names_without_the_owned_test_marker(string databaseName)
    {
        var act = () => TestDatabaseSafety.EnsureResetIsAllowed(databaseName, databaseName);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*not an owned test database*");
    }

    [Theory]
    [InlineData(TestDatabaseSafety.ContainerDatabaseName)]
    [InlineData("nine_to_shine_tests_0123456789abcdef0123456789abcdef")]
    public void Reset_accepts_owned_test_database_names(string databaseName)
    {
        var act = () => TestDatabaseSafety.EnsureResetIsAllowed(databaseName, databaseName);

        act.Should().NotThrow();
    }

    [Fact]
    public void Reset_rejects_a_database_that_does_not_match_the_fixture_lease()
    {
        var act = () => TestDatabaseSafety.EnsureResetIsAllowed(
            "nine_to_shine_tests_0123456789abcdef0123456789abcdef",
            "nine_to_shine_tests_fedcba9876543210fedcba9876543210");

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*because the test fixture owns*");
    }

    [Theory]
    [InlineData("Host=localhost;Username=postgres")]
    [InlineData("not a connection string")]
    public void Connection_string_requires_a_valid_explicit_database(string connectionString)
    {
        var act = () => TestDatabaseSafety.ParseConnectionString(connectionString);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Invalid_connection_string_error_does_not_expose_the_password()
    {
        const string password = "super-secret-password";
        var act = () => TestDatabaseSafety.ParseConnectionString(
            $"Host=localhost;Password={password};not a connection string");

        act.Should().Throw<InvalidOperationException>()
            .Which.Message.Should().NotContain(password);
    }
}
