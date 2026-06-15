using Microsoft.Extensions.DependencyInjection;
using NineToShineApi.Data;
using NineToShineApi.Models;

namespace NineToShineApi.Tests.Support;

[Collection(IntegrationTestCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;

    protected IntegrationTestBase(PostgresFixture postgres)
    {
        _postgres = postgres;
    }

    protected NineToShineApiFactory Factory { get; private set; } = null!;
    protected HttpClient Client { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Factory = new NineToShineApiFactory(_postgres.ConnectionString);
        _ = Factory.Server;
        await Factory.ResetDatabaseAsync();
        Client = Factory.CreateAuthenticatedClient();
    }

    public Task DisposeAsync()
    {
        Client.Dispose();
        Factory.Dispose();
        return Task.CompletedTask;
    }

    protected async Task SeedAsync(params object[] entities)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AddRange(entities);
        await db.SaveChangesAsync();
    }

    protected async Task<T> WithDbContextAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await action(db);
    }

    protected static User TestUser(
        string displayName = "Nina",
        string? email = "nina@example.test")
    {
        return new User
        {
            DisplayName = displayName,
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    protected static Season TestSeason(int seasonNumber = 1)
    {
        return new Season { SeasonNumber = seasonNumber };
    }

    protected static Game TestGame(
        Season season,
        User organizer,
        string gameName = "Tennis",
        DateTime? playedAt = null)
    {
        return new Game
        {
            Season = season,
            PlayedAt = playedAt ?? new DateTime(2026, 6, 15, 18, 0, 0, DateTimeKind.Utc),
            GameName = gameName,
            OrganizedByUser = organizer
        };
    }

    protected static Finance TestFinance(
        string direction,
        decimal amount,
        string category = "OTHER",
        DateTime? occurredAt = null,
        User? user = null,
        long? seasonId = null,
        Game? game = null)
    {
        return new Finance
        {
            Direction = direction,
            Amount = amount,
            Category = category,
            OccurredAt = occurredAt ?? new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc),
            User = user is { Id: 0 } ? user : null,
            UserId = user is { Id: > 0 } ? user.Id : null,
            SeasonId = seasonId,
            Game = game is { Id: 0 } ? game : null,
            GameId = game is { Id: > 0 } ? game.Id : null
        };
    }

    protected static Ranking TestRanking(long gameId, long userId, int points)
    {
        return new Ranking
        {
            GameId = gameId,
            UserId = userId,
            Points = points,
            IsPresent = true
        };
    }
}
