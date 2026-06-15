using System.Net;
using FluentAssertions;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class AuthAndInfrastructureTests : IntegrationTestBase
{
    public AuthAndInfrastructureTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Health_endpoint_is_public()
    {
        using var anonymousClient = Factory.CreateClient();

        var response = await anonymousClient.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
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
