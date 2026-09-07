using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Controllers;
using NineToShineApi.Models;
using NineToShineApi.Tests.Support;

namespace NineToShineApi.Tests;

public sealed class OrganizerDutyControllerTests : IntegrationTestBase
{
    public OrganizerDutyControllerTests(PostgresFixture postgres) : base(postgres)
    {
    }

    [Fact]
    public async Task Update_rotation_normalizes_distinct_users_and_replaces_existing_members()
    {
        var season = TestSeason();
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        await SeedAsync(season, nina, alex);

        var firstUpdate = await Client.PutAsJsonAsync($"/api/OrganizerDuty/rotation/{season.Id}", new
        {
            userIds = new[] { alex.Id, nina.Id, nina.Id, 0, -10 }
        });

        firstUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstMembers = await firstUpdate.Content
            .ReadFromJsonAsync<List<OrganizerRotationMemberDto>>();
        firstMembers.Should().NotBeNull();
        firstMembers!.Select(x => x.UserId).Should().Equal(alex.Id, nina.Id);
        firstMembers!.Select(x => x.SortOrder).Should().Equal(1, 2);

        var replacement = await Client.PutAsJsonAsync($"/api/OrganizerDuty/rotation/{season.Id}", new
        {
            userIds = new[] { nina.Id }
        });

        replacement.StatusCode.Should().Be(HttpStatusCode.OK);
        var finalMembers = await WithDbContextAsync(db => db.OrganizerRotationMembers
            .AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .ToListAsync());
        finalMembers.Should().ContainSingle();
        finalMembers[0].UserId.Should().Be(nina.Id);
    }

    [Fact]
    public async Task Create_without_user_uses_first_rotation_member_and_skip_clears_computed_user()
    {
        var season = TestSeason();
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        await SeedAsync(season, nina, alex);
        await SeedAsync(
            new OrganizerRotationMember { SeasonId = season.Id, UserId = alex.Id, SortOrder = 1 },
            new OrganizerRotationMember { SeasonId = season.Id, UserId = nina.Id, SortOrder = 2 });

        var createdResponse = await Client.PostAsJsonAsync("/api/OrganizerDuty", new
        {
            dutyDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id
        });

        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createdResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        created.Should().NotBeNull();
        created!.UserId.Should().Be(alex.Id);

        var skippedResponse = await Client.PatchAsJsonAsync(
            $"/api/OrganizerDuty/{created.Id}/skip",
            new { isSkipped = true });

        skippedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var skipped = await skippedResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        skipped.Should().NotBeNull();
        skipped!.IsSkipped.Should().BeTrue();
        skipped.UserId.Should().BeNull();
        skipped.UserDisplayName.Should().BeNull();
    }

    [Fact]
    public async Task Update_with_user_preserves_manual_override_when_season_has_rotation()
    {
        var season = TestSeason();
        var nina = TestUser("Nina", "nina@example.test");
        var alex = TestUser("Alex", "alex@example.test");
        var moritz = TestUser("Moritz", "moritz@example.test");
        await SeedAsync(season, nina, alex, moritz);
        await SeedAsync(
            new OrganizerRotationMember { SeasonId = season.Id, UserId = nina.Id, SortOrder = 1 },
            new OrganizerRotationMember { SeasonId = season.Id, UserId = alex.Id, SortOrder = 2 });

        var createdResponse = await Client.PostAsJsonAsync("/api/OrganizerDuty", new
        {
            dutyDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id
        });
        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createdResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();

        var followingResponse = await Client.PostAsJsonAsync("/api/OrganizerDuty", new
        {
            dutyDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id
        });
        followingResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var following = await followingResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();

        var updatedResponse = await Client.PutAsJsonAsync($"/api/OrganizerDuty/{created!.Id}", new
        {
            dutyDate = created.DutyDate,
            seasonId = season.Id,
            userId = moritz.Id,
            isSkipped = false,
            isManualOverride = true
        });

        updatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updatedResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        updated.Should().NotBeNull();
        updated!.UserId.Should().Be(moritz.Id);
        updated.UserDisplayName.Should().Be(moritz.DisplayName);

        var persisted = await WithDbContextAsync(db => db.OrganizerDuties
            .AsNoTracking()
            .SingleAsync(x => x.Id == created.Id));
        persisted.UserId.Should().Be(moritz.Id);
        persisted.IsManualOverride.Should().BeTrue();

        var loadedFollowing = await Client.GetFromJsonAsync<OrganizerDutyDto>(
            $"/api/OrganizerDuty/{following!.Id}");
        loadedFollowing.Should().NotBeNull();
        loadedFollowing!.UserId.Should().Be(alex.Id);
        loadedFollowing.IsManualOverride.Should().BeFalse();

        var rotationUpdate = await Client.PutAsJsonAsync($"/api/OrganizerDuty/rotation/{season.Id}", new
        {
            userIds = new[] { alex.Id, nina.Id }
        });
        rotationUpdate.StatusCode.Should().Be(HttpStatusCode.OK);

        var loaded = await Client.GetFromJsonAsync<OrganizerDutyDto>($"/api/OrganizerDuty/{created.Id}");
        loaded.Should().NotBeNull();
        loaded!.UserId.Should().Be(moritz.Id);
        loaded.UserDisplayName.Should().Be(moritz.DisplayName);

        loadedFollowing = await Client.GetFromJsonAsync<OrganizerDutyDto>(
            $"/api/OrganizerDuty/{following.Id}");
        loadedFollowing.Should().NotBeNull();
        loadedFollowing!.UserId.Should().Be(nina.Id);

        var skippedResponse = await Client.PatchAsJsonAsync(
            $"/api/OrganizerDuty/{created.Id}/skip",
            new { isSkipped = true });
        var skipped = await skippedResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        skippedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        skipped.Should().NotBeNull();
        skipped!.UserId.Should().BeNull();
        skipped.IsManualOverride.Should().BeTrue();

        var restoredResponse = await Client.PutAsJsonAsync(
            $"/api/OrganizerDuty/{created.Id}",
            new
            {
                dutyDate = created.DutyDate,
                seasonId = season.Id,
                isSkipped = false,
                isManualOverride = true
            });
        var restored = await restoredResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        restoredResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        restored.Should().NotBeNull();
        restored!.UserId.Should().Be(moritz.Id);
        restored.IsManualOverride.Should().BeTrue();
    }

    [Fact]
    public async Task Update_manual_override_flag_is_optional_and_can_restore_rotation()
    {
        var season = TestSeason();
        var nina = TestUser("Nina", "nina@example.test");
        var moritz = TestUser("Moritz", "moritz@example.test");
        await SeedAsync(season, nina, moritz);
        await SeedAsync(new OrganizerRotationMember
        {
            SeasonId = season.Id,
            UserId = nina.Id,
            SortOrder = 1
        });

        var createdResponse = await Client.PostAsJsonAsync("/api/OrganizerDuty", new
        {
            dutyDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            seasonId = season.Id
        });
        var created = await createdResponse.Content.ReadFromJsonAsync<OrganizerDutyDto>();

        var legacyUpdate = await Client.PutAsJsonAsync($"/api/OrganizerDuty/{created!.Id}", new
        {
            dutyDate = created.DutyDate,
            seasonId = season.Id,
            userId = moritz.Id
        });
        var inferredOverride = await legacyUpdate.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        legacyUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        inferredOverride.Should().NotBeNull();
        inferredOverride!.UserId.Should().Be(moritz.Id);
        inferredOverride.IsManualOverride.Should().BeTrue();

        var automaticUpdate = await Client.PutAsJsonAsync($"/api/OrganizerDuty/{created.Id}", new
        {
            dutyDate = created.DutyDate,
            seasonId = season.Id,
            isManualOverride = false
        });
        var automatic = await automaticUpdate.Content.ReadFromJsonAsync<OrganizerDutyDto>();
        automaticUpdate.StatusCode.Should().Be(HttpStatusCode.OK);
        automatic.Should().NotBeNull();
        automatic!.UserId.Should().Be(nina.Id);
        automatic.IsManualOverride.Should().BeFalse();

        var invalidUpdate = await Client.PutAsJsonAsync($"/api/OrganizerDuty/{created.Id}", new
        {
            dutyDate = created.DutyDate,
            seasonId = season.Id,
            isManualOverride = true
        });
        invalidUpdate.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var unchanged = await Client.GetFromJsonAsync<OrganizerDutyDto>(
            $"/api/OrganizerDuty/{created.Id}");
        unchanged.Should().NotBeNull();
        unchanged!.UserId.Should().Be(nina.Id);
        unchanged.IsManualOverride.Should().BeFalse();
    }

    [Fact]
    public async Task Generate_creates_missing_months_and_skips_existing_months()
    {
        var season = TestSeason();
        var user = TestUser();
        await SeedAsync(season, user);
        await SeedAsync(
            new OrganizerRotationMember { SeasonId = season.Id, UserId = user.Id, SortOrder = 1 },
            new OrganizerDuty
            {
                SeasonId = season.Id,
                UserId = user.Id,
                DutyDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
                IsSkipped = false
            });

        var response = await Client.PostAsJsonAsync("/api/OrganizerDuty/generate", new
        {
            seasonId = season.Id,
            startMonth = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc),
            monthCount = 3
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<GenerateOrganizerDutiesResponse>();
        body.Should().NotBeNull();
        body!.CreatedCount.Should().Be(2);
        body.ExistingCount.Should().Be(1);
        body.Duties.Select(x => x.DutyDate.Month).Should().Contain(new[] { 1, 2, 3 });
    }

    [Fact]
    public async Task Next_organizer_ignores_current_month_and_skipped_duties()
    {
        var season = TestSeason();
        var user = TestUser();
        await SeedAsync(season, user);
        await SeedAsync(new OrganizerRotationMember
        {
            SeasonId = season.Id,
            UserId = user.Id,
            SortOrder = 1
        });

        var nextMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1)
            .AddMonths(1);
        var followingMonth = nextMonth.AddMonths(1);

        await SeedAsync(
            new OrganizerDuty
            {
                SeasonId = season.Id,
                UserId = user.Id,
                DutyDate = DateTime.SpecifyKind(nextMonth, DateTimeKind.Utc),
                IsSkipped = true
            },
            new OrganizerDuty
            {
                SeasonId = season.Id,
                UserId = user.Id,
                DutyDate = DateTime.SpecifyKind(followingMonth, DateTimeKind.Utc),
                IsSkipped = false
            });

        var next = await Client.GetFromJsonAsync<OrganizerDutyDto>("/api/OrganizerDuty/next");

        next.Should().NotBeNull();
        next!.DutyDate.Month.Should().Be(followingMonth.Month);
        next.UserId.Should().Be(user.Id);
    }
}
