using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Data;
using NineToShineApi.Models;
using System.ComponentModel.DataAnnotations;

namespace NineToShineApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrganizerDutyController : ControllerBase
    {
        private readonly AppDbContext _db;
        public OrganizerDutyController(AppDbContext db) => _db = db;

        // GET: api/OrganizerDuty?userId=1
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrganizerDutyDto>>> GetAll(
            [FromQuery] long? userId,
            CancellationToken ct = default)
        {
            IQueryable<OrganizerDuty> q = _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id);

            var list = await BuildOrganizerDutyDtosAsync(q, ct);

            if (userId.HasValue)
                list = list.Where(x => x.UserId == userId.Value).ToList();

            return Ok(list);
        }

        // GET: api/OrganizerDuty/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<OrganizerDutyDto>> GetById(long id, CancellationToken ct)
        {
            var duty = await _db.OrganizerDuties
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, ct);

            if (duty is null)
                return NotFound();

            var seasonDuties = _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .Where(x => x.SeasonId == duty.SeasonId)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id);

            var dto = (await BuildOrganizerDutyDtosAsync(seasonDuties, ct))
                .First(x => x.Id == id);

            return Ok(dto);
        }

        // GET: api/OrganizerDuty/next
        // Returns the next non-skipped organizer duty after the current month.
        [HttpGet("next")]
        public async Task<ActionResult<OrganizerDutyDto>> GetNextOrganizer(CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;
            var startOfNextMonth = new DateTime(today.Year, today.Month, 1).AddMonths(1);

            var allDuties = _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id);

            var nextDuty = (await BuildOrganizerDutyDtosAsync(allDuties, ct))
                .Where(x => x.DutyDate >= startOfNextMonth && !x.IsSkipped)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id)
                .FirstOrDefault();

            if (nextDuty is null)
                return NoContent();

            return Ok(nextDuty);
        }

        // POST: api/OrganizerDuty
        [HttpPost]
        public async Task<ActionResult<OrganizerDutyDto>> Create(
            [FromBody] CreateOrganizerDutyRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var season = await _db.Season
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == body.SeasonId, ct);

            if (season is null)
                return BadRequest(new { error = "season_id not found." });

            var userId = await ResolveDutyUserIdAsync(body.SeasonId, body.UserId, ct);
            if (userId is null)
                return BadRequest(new { error = "user_id not found and no rotation exists for this season." });

            OrganizerDuty entity = new OrganizerDuty
            {
                DutyDate = body.DutyDate.Date,
                UserId = userId.Value,
                SeasonId = body.SeasonId,
                IsSkipped = body.IsSkipped
            };

            _db.OrganizerDuties.Add(entity);
            await _db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, await GetComputedDtoAsync(entity.Id, ct));
        }

        // POST: api/OrganizerDuty/generate
        [HttpPost("generate")]
        public async Task<ActionResult<GenerateOrganizerDutiesResponse>> Generate(
            [FromBody] GenerateOrganizerDutiesRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            if (body.MonthCount < 1 || body.MonthCount > 36)
                return BadRequest(new { error = "month_count must be between 1 and 36." });

            var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            var rotationUserId = await _db.OrganizerRotationMembers
                .AsNoTracking()
                .Where(x => x.SeasonId == body.SeasonId)
                .OrderBy(x => x.SortOrder)
                .Select(x => (long?)x.UserId)
                .FirstOrDefaultAsync(ct);

            if (rotationUserId is null)
                return BadRequest(new { error = "No rotation exists for this season." });

            var startMonth = new DateTime(body.StartMonth.Year, body.StartMonth.Month, 1);
            var targetMonths = Enumerable
                .Range(0, body.MonthCount)
                .Select(offset => startMonth.AddMonths(offset))
                .ToList();

            var endExclusive = targetMonths.Last().AddMonths(1);
            var existingDates = await _db.OrganizerDuties
                .Where(x =>
                    x.SeasonId == body.SeasonId &&
                    x.DutyDate >= startMonth &&
                    x.DutyDate < endExclusive)
                .Select(x => x.DutyDate)
                .ToListAsync(ct);

            var existingMonthKeys = existingDates
                .Select(x => new DateTime(x.Year, x.Month, 1))
                .ToHashSet();

            var createdCount = 0;

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            foreach (var month in targetMonths)
            {
                if (existingMonthKeys.Contains(month))
                    continue;

                _db.OrganizerDuties.Add(new OrganizerDuty
                {
                    SeasonId = body.SeasonId,
                    DutyDate = month,
                    UserId = rotationUserId.Value,
                    IsSkipped = false
                });
                createdCount++;
            }

            if (createdCount > 0)
                await _db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);

            var seasonDuties = _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .Where(x => x.SeasonId == body.SeasonId)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id);

            var duties = await BuildOrganizerDutyDtosAsync(seasonDuties, ct);

            return Ok(new GenerateOrganizerDutiesResponse(
                createdCount,
                body.MonthCount - createdCount,
                duties
            ));
        }

        // PUT: api/OrganizerDuty/123
        [HttpPut("{id:long}")]
        public async Task<ActionResult<OrganizerDutyDto>> Update(
            long id,
            [FromBody] CreateOrganizerDutyRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var entity = await _db.OrganizerDuties.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null)
                return NotFound();

            var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            var userId = await ResolveDutyUserIdAsync(body.SeasonId, body.UserId, ct);
            if (userId is null)
                return BadRequest(new { error = "user_id not found and no rotation exists for this season." });

            entity.DutyDate = body.DutyDate.Date;
            entity.UserId = userId.Value;
            entity.SeasonId = body.SeasonId;
            entity.IsSkipped = body.IsSkipped;

            await _db.SaveChangesAsync(ct);

            return Ok(await GetComputedDtoAsync(entity.Id, ct));
        }

        // PATCH: api/OrganizerDuty/123/skip
        [HttpPatch("{id:long}/skip")]
        public async Task<ActionResult<OrganizerDutyDto>> SetSkipped(
            long id,
            [FromBody] UpdateOrganizerDutySkipRequest body,
            CancellationToken ct)
        {
            var entity = await _db.OrganizerDuties.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null)
                return NotFound();

            entity.IsSkipped = body.IsSkipped;
            await _db.SaveChangesAsync(ct);

            return Ok(await GetComputedDtoAsync(entity.Id, ct));
        }

        // DELETE: api/OrganizerDuty/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            OrganizerDuty? entity = await _db.OrganizerDuties.FirstOrDefaultAsync(x => x.Id == id, ct);

            if (entity is null)
                return NotFound();

            _db.OrganizerDuties.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // GET: api/OrganizerDuty/rotation?seasonId=1
        [HttpGet("rotation")]
        public async Task<ActionResult<IEnumerable<OrganizerRotationMemberDto>>> GetRotation(
            [FromQuery] long seasonId,
            CancellationToken ct = default)
        {
            var members = await _db.OrganizerRotationMembers
                .AsNoTracking()
                .Include(x => x.User)
                .Where(x => x.SeasonId == seasonId)
                .OrderBy(x => x.SortOrder)
                .Select(x => new OrganizerRotationMemberDto(
                    x.Id,
                    x.SeasonId,
                    x.UserId,
                    x.User.DisplayName,
                    x.SortOrder
                ))
                .ToListAsync(ct);

            return Ok(members);
        }

        // PUT: api/OrganizerDuty/rotation/1
        [HttpPut("rotation/{seasonId:long}")]
        public async Task<ActionResult<IEnumerable<OrganizerRotationMemberDto>>> UpdateRotation(
            long seasonId,
            [FromBody] UpdateOrganizerRotationRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var normalizedUserIds = body.UserIds
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (normalizedUserIds.Count == 0)
                return BadRequest(new { error = "At least one user is required." });

            var seasonExists = await _db.Season.AnyAsync(x => x.Id == seasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            var existingUserCount = await _db.Users
                .Where(x => normalizedUserIds.Contains(x.Id))
                .CountAsync(ct);

            if (existingUserCount != normalizedUserIds.Count)
                return BadRequest(new { error = "One or more user_id values were not found." });

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var existing = await _db.OrganizerRotationMembers
                .Where(x => x.SeasonId == seasonId)
                .ToListAsync(ct);

            if (existing.Count > 0)
            {
                _db.OrganizerRotationMembers.RemoveRange(existing);
                await _db.SaveChangesAsync(ct);
            }

            for (var i = 0; i < normalizedUserIds.Count; i++)
            {
                _db.OrganizerRotationMembers.Add(new OrganizerRotationMember
                {
                    SeasonId = seasonId,
                    UserId = normalizedUserIds[i],
                    SortOrder = i + 1
                });
            }

            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return Ok(await _db.OrganizerRotationMembers
                .AsNoTracking()
                .Include(x => x.User)
                .Where(x => x.SeasonId == seasonId)
                .OrderBy(x => x.SortOrder)
                .Select(x => new OrganizerRotationMemberDto(
                    x.Id,
                    x.SeasonId,
                    x.UserId,
                    x.User.DisplayName,
                    x.SortOrder
                ))
                .ToListAsync(ct));
        }

        private async Task<long?> ResolveDutyUserIdAsync(long seasonId, long? requestedUserId, CancellationToken ct)
        {
            if (requestedUserId.HasValue)
            {
                var exists = await _db.Users.AnyAsync(u => u.Id == requestedUserId.Value, ct);
                return exists ? requestedUserId.Value : null;
            }

            var firstRotationMember = await _db.OrganizerRotationMembers
                .AsNoTracking()
                .Where(x => x.SeasonId == seasonId)
                .OrderBy(x => x.SortOrder)
                .FirstOrDefaultAsync(ct);

            return firstRotationMember?.UserId;
        }

        private async Task<OrganizerDutyDto> GetComputedDtoAsync(long id, CancellationToken ct)
        {
            var duty = await _db.OrganizerDuties
                .AsNoTracking()
                .FirstAsync(x => x.Id == id, ct);

            var seasonDuties = _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .Where(x => x.SeasonId == duty.SeasonId)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id);

            return (await BuildOrganizerDutyDtosAsync(seasonDuties, ct)).First(x => x.Id == id);
        }

        private async Task<List<OrganizerDutyDto>> BuildOrganizerDutyDtosAsync(
            IQueryable<OrganizerDuty> source,
            CancellationToken ct)
        {
            var duties = await source
                .Include(x => x.User)
                .Include(x => x.Season)
                .OrderBy(x => x.DutyDate)
                .ThenBy(x => x.Id)
                .ToListAsync(ct);

            var seasonIds = duties.Select(x => x.SeasonId).Distinct().ToList();

            var rotationMembers = await _db.OrganizerRotationMembers
                .AsNoTracking()
                .Include(x => x.User)
                .Where(x => seasonIds.Contains(x.SeasonId))
                .OrderBy(x => x.SortOrder)
                .ToListAsync(ct);

            var rotationBySeason = rotationMembers
                .GroupBy(x => x.SeasonId)
                .ToDictionary(x => x.Key, x => x.OrderBy(m => m.SortOrder).ToList());

            var activeIndexBySeason = new Dictionary<long, int>();
            var result = new List<OrganizerDutyDto>();

            foreach (var duty in duties)
            {
                rotationBySeason.TryGetValue(duty.SeasonId, out var rotation);
                rotation ??= new List<OrganizerRotationMember>();

                long? userId = null;
                string? userDisplayName = null;

                if (!duty.IsSkipped)
                {
                    if (rotation.Count > 0)
                    {
                        var activeIndex = activeIndexBySeason.GetValueOrDefault(duty.SeasonId);
                        var member = rotation[activeIndex % rotation.Count];
                        userId = member.UserId;
                        userDisplayName = member.User.DisplayName;
                        activeIndexBySeason[duty.SeasonId] = activeIndex + 1;
                    }
                    else
                    {
                        userId = duty.UserId;
                        userDisplayName = duty.User.DisplayName;
                    }
                }

                result.Add(new OrganizerDutyDto(
                    duty.Id,
                    duty.DutyDate,
                    userId,
                    userDisplayName,
                    duty.SeasonId,
                    duty.Season.SeasonNumber,
                    duty.IsSkipped
                ));
            }

            return result;
        }
    }

    public record OrganizerDutyDto(
        long Id,
        DateTime DutyDate,
        long? UserId,
        string? UserDisplayName,
        long SeasonId,
        int SeasonDisplayNumber,
        bool IsSkipped
    );

    public record OrganizerRotationMemberDto(
        long Id,
        long SeasonId,
        long UserId,
        string UserDisplayName,
        int SortOrder
    );

    public class CreateOrganizerDutyRequest
    {
        [Required]
        public DateTime DutyDate { get; set; }

        [Display(Name = "user_id")]
        public long? UserId { get; set; }

        [Required]
        [Display(Name = "season_id")]
        public long SeasonId { get; set; }

        public bool IsSkipped { get; set; }
    }

    public class UpdateOrganizerDutySkipRequest
    {
        public bool IsSkipped { get; set; }
    }

    public class UpdateOrganizerRotationRequest
    {
        [Required]
        public List<long> UserIds { get; set; } = new();
    }

    public class GenerateOrganizerDutiesRequest
    {
        [Required]
        [Display(Name = "season_id")]
        public long SeasonId { get; set; }

        [Required]
        [Display(Name = "start_month")]
        public DateTime StartMonth { get; set; }

        [Required]
        [Range(1, 36)]
        [Display(Name = "month_count")]
        public int MonthCount { get; set; }
    }

    public record GenerateOrganizerDutiesResponse(
        int CreatedCount,
        int ExistingCount,
        List<OrganizerDutyDto> Duties
    );
}
