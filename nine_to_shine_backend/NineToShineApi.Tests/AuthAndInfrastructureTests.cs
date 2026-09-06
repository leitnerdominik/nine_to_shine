using System.Diagnostics;
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NineToShineApi.Data;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class AuthAndInfrastructureTests : IntegrationTestBase
{
    public AuthAndInfrastructureTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/health/ready")]
    [InlineData("/api/health/live")]
    public async Task Health_endpoints_are_public_and_healthy_when_database_is_available(string path)
    {
        using var anonymousClient = Factory.CreateClient();

        var response = await anonymousClient.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Readiness_is_unhealthy_while_liveness_stays_healthy_when_database_is_unavailable()
    {
        const string unavailableConnectionString =
            "Host=127.0.0.1;Port=1;Database=unavailable;Username=test;Password=test;" +
            "Timeout=1;Command Timeout=1;Pooling=false";

        using var factory = Factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql(unavailableConnectionString));
            });
        });
        using var anonymousClient = factory.CreateClient();

        var readinessResponse = await anonymousClient.GetAsync("/api/health/ready");
        var compatibilityResponse = await anonymousClient.GetAsync("/api/health");
        var livenessResponse = await anonymousClient.GetAsync("/api/health/live");

        readinessResponse.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        compatibilityResponse.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        livenessResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Migration_failure_stops_application_startup()
    {
        const string unavailableConnectionString =
            "Host=127.0.0.1;Port=1;Database=unavailable;Username=test;Password=test;" +
            "Timeout=1;Command Timeout=1;Pooling=false";
        var workingDirectory = Path.Combine(
            Path.GetTempPath(),
            $"nine-to-shine-startup-{Guid.NewGuid():N}");
        Directory.CreateDirectory(workingDirectory);

        try
        {
            var startInfo = new ProcessStartInfo("dotnet")
            {
                CreateNoWindow = true,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                WorkingDirectory = workingDirectory
            };
            startInfo.ArgumentList.Add(typeof(Program).Assembly.Location);
            startInfo.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
            startInfo.Environment["DOTNET_ENVIRONMENT"] = "Production";
            startInfo.Environment["ConnectionStrings__DefaultConnection"] = unavailableConnectionString;
            startInfo.Environment["Firebase__ProjectId"] = "nine-to-shine-tests";

            using var process = Process.Start(startInfo);
            process.Should().NotBeNull();

            var standardOutput = process!.StandardOutput.ReadToEndAsync();
            var standardError = process.StandardError.ReadToEndAsync();
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));

            try
            {
                await process.WaitForExitAsync(timeout.Token);
            }
            catch (OperationCanceledException)
            {
                process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync();
                throw;
            }

            var output = await standardOutput + await standardError;

            process.ExitCode.Should().NotBe(0, "the startup output was: {0}", output);
            output.Should()
                .Contain("Application start-up failed")
                .And.Contain("MigrateAsync")
                .And.Contain("unavailable");
        }
        finally
        {
            Directory.Delete(workingDirectory, recursive: true);
        }
    }

    [Fact]
    public async Task Protected_endpoints_reject_anonymous_requests()
    {
        using var anonymousClient = Factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/user");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Protected_endpoints_accept_test_authenticated_requests()
    {
        var response = await Client.GetAsync("/api/user");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Cors_policy_allows_documented_local_frontend_origin()
    {
        using var anonymousClient = Factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/user");
        request.Headers.Add("Origin", "http://localhost:3000");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await anonymousClient.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        response.Headers
            .GetValues("Access-Control-Allow-Origin")
            .Should()
            .Contain("http://localhost:3000");
    }

    [Fact]
    public async Task Cors_policy_does_not_allow_unexpected_origins()
    {
        using var anonymousClient = Factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/user");
        request.Headers.Add("Origin", "https://evil.example");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await anonymousClient.SendAsync(request);

        response.Headers.Contains("Access-Control-Allow-Origin").Should().BeFalse();
    }
}
