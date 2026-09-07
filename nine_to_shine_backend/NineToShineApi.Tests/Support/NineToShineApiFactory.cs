using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using NineToShineApi.Data;

namespace NineToShineApi.Tests.Support;

public sealed class NineToShineApiFactory : WebApplicationFactory<Program>
{
    private readonly PostgresFixture.TestDatabaseLease _databaseLease;
    private readonly string _environmentName;
    private readonly bool _seedDevelopmentData;

    public NineToShineApiFactory(
        PostgresFixture.TestDatabaseLease databaseLease,
        string environmentName = "Testing",
        bool seedDevelopmentData = false)
    {
        _databaseLease = databaseLease;
        _environmentName = environmentName;
        _seedDevelopmentData = seedDevelopmentData;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environmentName);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _databaseLease.ConnectionString,
                ["Firebase:ProjectId"] = "nine-to-shine-tests",
                ["DevelopmentData:Seed"] = _seedDevelopmentData.ToString()
            });
        });

        builder.ConfigureLogging(logging => logging.ClearProviders());

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(_databaseLease.ConnectionString));

            services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    _ => { });
        });
    }

    public HttpClient CreateAuthenticatedClient(
        string userId = "test-user",
        string email = "test@example.test")
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId);
        client.DefaultRequestHeaders.Add(TestAuthHandler.EmailHeader, email);
        return client;
    }

    public async Task ResetDatabaseAsync(string? targetMigration = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        TestDatabaseSafety.EnsureResetIsAllowed(
            _databaseLease.DatabaseName,
            db.Database.GetDbConnection().Database);
        await db.Database.EnsureDeletedAsync();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(targetMigration);
    }
}
