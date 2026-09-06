using Microsoft.EntityFrameworkCore;
using NineToShineApi.Models;

namespace NineToShineApi.Data;

public static class DevelopmentDataSeeder
{
    public const int PreviousDemoSeasonNumber = 900001;
    public const int DemoSeasonNumber = 900002;

    private const string DemoEmailSuffix = ".nine-to-shine@example.test";

    public static async Task SeedAsync(
        AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(db);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (await db.Season.AnyAsync(
                season => season.SeasonNumber == DemoSeasonNumber,
                cancellationToken))
        {
            return;
        }

        var today = DateTime.UtcNow.Date;

        var users = new[]
        {
            DemoUser("Lena Hartmann", "lena", true, today.AddDays(-720)),
            DemoUser("Tobias Gruber", "tobias", true, today.AddDays(-690)),
            DemoUser("Miriam Pichler", "miriam", true, today.AddDays(-660)),
            DemoUser("Jonas Kofler", "jonas", true, today.AddDays(-630)),
            DemoUser("Sara Hofer", "sara", true, today.AddDays(-600)),
            DemoUser("Felix Mair", "felix", true, today.AddDays(-570)),
            DemoUser("Nina Berger", "nina", true, today.AddDays(-540)),
            DemoUser("Paul Leitner", "paul", false, today.AddDays(-900)),
            DemoUser("Clara Egger", "clara", false, today.AddDays(-840))
        };

        var previousSeason = new Season { SeasonNumber = PreviousDemoSeasonNumber };
        var currentSeason = new Season { SeasonNumber = DemoSeasonNumber };

        db.Users.AddRange(users);
        db.Season.AddRange(previousSeason, currentSeason);
        await db.SaveChangesAsync(cancellationToken);

        var games = new[]
        {
            DemoGame(previousSeason, users[0], "Demo-Watten", AtUtc(today.AddDays(-330), 19)),
            DemoGame(previousSeason, users[5], "Demo-Kegeln", AtUtc(today.AddDays(-270), 18)),
            DemoGame(currentSeason, users[1], "Demo-Tischtennis", AtUtc(today.AddDays(-75), 19)),
            DemoGame(currentSeason, users[3], "Demo-Pubquiz", AtUtc(today.AddDays(-45), 20)),
            DemoGame(currentSeason, users[2], "Demo-Bowling", AtUtc(today.AddDays(-14), 18)),
            DemoGame(currentSeason, users[4], "Demo-Spieleabend (geplant)", AtUtc(today.AddDays(14), 19))
        };

        db.Game.AddRange(games);
        await db.SaveChangesAsync(cancellationToken);

        var rankings = new List<Ranking>();
        AddRankings(rankings, games[0], users, [10, 6, 3, 0, 8, 2, 1, 4, 5], 6);
        AddRankings(rankings, games[1], users, [2, 4, 8, 1, 3, 10, 0, 5, 6], 6);
        AddRankings(rankings, games[2], users, [1, 10, 4, 8, 2, 5, 0, 6, 3], 4);
        AddRankings(rankings, games[3], users, [5, 4, 2, 10, 3, 0, 6, 1, 8], 5);
        AddRankings(rankings, games[4], users, [7, 3, 10, 2, 5, 8, 1, 0, 4], 7);

        var rotationMembers = new List<OrganizerRotationMember>();
        AddRotation(rotationMembers, previousSeason, users[..4]);
        AddRotation(rotationMembers, currentSeason, users[..6]);

        var previousSeasonStart = StartOfMonth(today.AddMonths(-12));
        var currentSeasonStart = StartOfMonth(today.AddMonths(-2));
        var duties = new[]
        {
            DemoDuty(previousSeason, users[0], previousSeasonStart),
            DemoDuty(previousSeason, users[1], previousSeasonStart.AddMonths(1)),
            DemoDuty(previousSeason, users[2], previousSeasonStart.AddMonths(2), isSkipped: true),
            DemoDuty(previousSeason, users[2], previousSeasonStart.AddMonths(3)),
            DemoDuty(currentSeason, users[0], currentSeasonStart),
            DemoDuty(currentSeason, users[1], currentSeasonStart.AddMonths(1), isSkipped: true),
            DemoDuty(currentSeason, users[1], currentSeasonStart.AddMonths(2)),
            DemoDuty(currentSeason, users[2], currentSeasonStart.AddMonths(3)),
            DemoDuty(currentSeason, users[3], currentSeasonStart.AddMonths(4)),
            DemoDuty(currentSeason, users[4], currentSeasonStart.AddMonths(5)),
            DemoDuty(currentSeason, users[5], currentSeasonStart.AddMonths(6))
        };

        var previousTripDate = AtUtc(today.AddDays(-250), 8);
        var currentTripDate = AtUtc(today.AddDays(-28), 8);
        var previousTrip = new Trip
        {
            OccurredAt = previousTripDate,
            Name = "Demo-Ausflug: Zugfahrt",
            SeasonId = previousSeason.Id
        };
        var currentTrip = new Trip
        {
            OccurredAt = currentTripDate,
            Name = "Demo-Wanderung: Jause",
            SeasonId = currentSeason.Id
        };
        db.Trips.AddRange(previousTrip, currentTrip);

        var finance = new[]
        {
            DemoFinance(games[0].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[0], previousSeason, games[0]),
            DemoFinance(games[0].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[1], previousSeason, games[0]),
            DemoFinance(games[0].PlayedAt, "income", 12m, "OTHER", "Demo-Getränkekasse", null, previousSeason, games[0]),
            DemoFinance(games[0].PlayedAt, "expense", 85.50m, "EVENT", "Bahnmiete", null, previousSeason, games[0]),
            DemoFinance(games[1].PlayedAt, "income", 10m, "FINE", "Verspätungsstrafe", users[2], previousSeason, games[1]),
            DemoFinance(previousTripDate, "expense", 24.50m, "TRIP", "Demo-Ausflug: Zugfahrt", users[0], previousSeason, trip: previousTrip),
            DemoFinance(previousTripDate, "expense", 24.50m, "TRIP", "Demo-Ausflug: Zugfahrt", users[1], previousSeason, trip: previousTrip),

            DemoFinance(games[2].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[0], currentSeason, games[2]),
            DemoFinance(games[2].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[1], currentSeason, games[2]),
            DemoFinance(games[2].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[2], currentSeason, games[2]),
            DemoFinance(games[2].PlayedAt, "income", 20m, "DUES", "Vereinsanteil (Lena Hartmann)", null, currentSeason, games[2]),
            DemoFinance(games[2].PlayedAt, "income", 15m, "OTHER", "Einnahmen aus Tombola", null, currentSeason, games[2]),
            DemoFinance(games[2].PlayedAt, "expense", 62.40m, "EVENT", "Raummiete", null, currentSeason, games[2]),

            DemoFinance(games[3].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[0], currentSeason, games[3]),
            DemoFinance(games[3].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[3], currentSeason, games[3]),
            DemoFinance(games[3].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[4], currentSeason, games[3]),
            DemoFinance(games[3].PlayedAt, "income", 30m, "DUES", "Mitgliedsbeitrag", users[5], currentSeason, games[3]),
            DemoFinance(games[3].PlayedAt, "expense", 18.90m, "OTHER", "Druckkosten und Namensschilder", null, currentSeason),
            DemoFinance(games[4].PlayedAt, "expense", 96m, "EVENT", "Bowlingbahnen", null, currentSeason, games[4]),
            DemoFinance(AtUtc(today.AddDays(-21), 12), "income", 7.50m, "FINE", "Handy am Tisch", users[5], currentSeason),
            DemoFinance(AtUtc(today.AddDays(-20), 10), "expense", 39.80m, "OTHER", "Neue Spielkarten", null, currentSeason),
            DemoFinance(currentTripDate, "expense", 18.75m, "TRIP", "Demo-Wanderung: Jause", users[0], currentSeason, trip: currentTrip),
            DemoFinance(currentTripDate, "expense", 18.75m, "TRIP", "Demo-Wanderung: Jause", users[2], currentSeason, trip: currentTrip),
            DemoFinance(currentTripDate, "expense", 18.75m, "TRIP", "Demo-Wanderung: Jause", users[4], currentSeason, trip: currentTrip)
        };

        db.Rankings.AddRange(rankings);
        db.OrganizerRotationMembers.AddRange(rotationMembers);
        db.OrganizerDuties.AddRange(duties);
        db.Finance.AddRange(finance);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private static User DemoUser(
        string displayName,
        string emailPrefix,
        bool isActive,
        DateTime createdAt)
    {
        return new User
        {
            DisplayName = $"Demo {displayName}",
            Email = $"{emailPrefix}{DemoEmailSuffix}",
            IsActive = isActive,
            CreatedAt = createdAt
        };
    }

    private static Game DemoGame(
        Season season,
        User organizer,
        string gameName,
        DateTime playedAt)
    {
        return new Game
        {
            SeasonId = season.Id,
            PlayedAt = playedAt,
            GameName = gameName,
            OrganizedByUserId = organizer.Id
        };
    }

    private static void AddRankings(
        ICollection<Ranking> rankings,
        Game game,
        IReadOnlyList<User> users,
        IReadOnlyList<int> points,
        params int[] absentUserIndexes)
    {
        if (users.Count != points.Count)
            throw new InvalidOperationException("Each demo user must have one ranking entry.");

        var absentUsers = absentUserIndexes.ToHashSet();

        for (var index = 0; index < users.Count; index++)
        {
            rankings.Add(new Ranking
            {
                GameId = game.Id,
                UserId = users[index].Id,
                Points = absentUsers.Contains(index) ? 0 : points[index],
                IsPresent = !absentUsers.Contains(index)
            });
        }
    }

    private static void AddRotation(
        ICollection<OrganizerRotationMember> rotationMembers,
        Season season,
        IReadOnlyList<User> users)
    {
        for (var index = 0; index < users.Count; index++)
        {
            rotationMembers.Add(new OrganizerRotationMember
            {
                SeasonId = season.Id,
                UserId = users[index].Id,
                SortOrder = index + 1
            });
        }
    }

    private static OrganizerDuty DemoDuty(
        Season season,
        User user,
        DateTime dutyDate,
        bool isSkipped = false)
    {
        return new OrganizerDuty
        {
            SeasonId = season.Id,
            UserId = user.Id,
            DutyDate = dutyDate,
            IsSkipped = isSkipped
        };
    }

    private static Finance DemoFinance(
        DateTime occurredAt,
        string direction,
        decimal amount,
        string category,
        string description,
        User? user,
        Season season,
        Game? game = null,
        Trip? trip = null)
    {
        return new Finance
        {
            OccurredAt = occurredAt,
            Direction = direction,
            Amount = amount,
            Category = category,
            Description = description,
            UserId = user?.Id,
            SeasonId = season.Id,
            GameId = game?.Id,
            Trip = trip
        };
    }

    private static DateTime AtUtc(DateTime date, int hour)
    {
        return DateTime.SpecifyKind(date.Date.AddHours(hour), DateTimeKind.Utc);
    }

    private static DateTime StartOfMonth(DateTime date)
    {
        return new DateTime(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }
}
