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
                .OrderBy(x => x.DutyDate)
                .AsQueryable();

            if (userId.HasValue)
                q = q.Where(x => x.UserId == userId.Value);

            List<OrganizerDutyDto> list = await q
                .Select(x => new OrganizerDutyDto(
                    x.Id,
                    x.DutyDate,
                    x.UserId,
                    x.User.DisplayName,
                    x.SeasonId,
                    x.Season.SeasonNumber
                ))
                .ToListAsync(ct);

            return Ok(list);
        }

        // GET: api/OrganizerDuty/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<OrganizerDutyDto>> GetById(long id, CancellationToken ct)
        {
            var x = await _db.OrganizerDuties
                .AsNoTracking()
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == id, ct);

            if (x is null)
                return NotFound();

            return Ok(new OrganizerDutyDto(
                x.Id,
                x.DutyDate,
                x.UserId,
                x.User.DisplayName,
                x.SeasonId,
                x.Season.SeasonNumber
            ));
        }

        // GET: api/OrganizerDuty/next
        // Returns the organizer for the NEXT month relative to today.
        // E.g., if today is in September, it returns the organizer for October.
        [HttpGet("next")]
        public async Task<ActionResult<OrganizerDutyDto>> GetNextOrganizer(CancellationToken ct)
        {
            var today = DateTime.UtcNow.Date;

            var startOfNextMonth = new DateTime(today.Year, today.Month, 1).AddMonths(1);

            var startOfMonthAfterNext = startOfNextMonth.AddMonths(1);

            var nextDuty = await _db.OrganizerDuties
                .AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Season)
                .Where(x => x.DutyDate >= startOfNextMonth && x.DutyDate < startOfMonthAfterNext)
                .OrderBy(x => x.DutyDate)
                .FirstOrDefaultAsync(ct);

            if (nextDuty == null)
            {
                return NoContent();
            }

            return Ok(new OrganizerDutyDto(
                nextDuty.Id,
                nextDuty.DutyDate,
                nextDuty.UserId,
                nextDuty.User.DisplayName,
                nextDuty.SeasonId,
                nextDuty.Season.SeasonNumber
            ));
        }

        // POST: api/OrganizerDuty
        [HttpPost]
        public async Task<ActionResult<OrganizerDutyDto>> Create(
            [FromBody] CreateOrganizerDutyRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            User? user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == body.UserId, ct);
            if (user is null)
                return BadRequest(new { error = "user_id not found." });

            var season = await _db.Season
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == body.SeasonId, ct);

            if (season is null)
                return BadRequest(new { error = "season_id not found." });

            OrganizerDuty entity = new OrganizerDuty
            {
                DutyDate = body.DutyDate.Date,
                UserId = body.UserId,
                SeasonId = body.SeasonId
            };

            _db.OrganizerDuties.Add(entity);
            await _db.SaveChangesAsync(ct);

            var dto = new OrganizerDutyDto(
                entity.Id,
                entity.DutyDate,
                entity.UserId,
                user.DisplayName,
                entity.SeasonId,
                season.SeasonNumber
            );

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
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
            if (entity is null) return NotFound();

            var userExists = await _db.Users.AnyAsync(u => u.Id == body.UserId, ct);
            if (!userExists)
                return BadRequest(new { error = "user_id not found." });

            var seasonExists = await this._db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            entity.DutyDate = body.DutyDate.Date;
            entity.UserId = body.UserId;
            entity.SeasonId = body.SeasonId;

            await _db.SaveChangesAsync(ct);

            var user = await _db.Users
                .AsNoTracking()
                .FirstAsync(u => u.Id == entity.UserId, ct);

            var season = await _db.Season
                .AsNoTracking()
                .FirstAsync(s => s.Id == entity.UserId, ct);

            var dto = new OrganizerDutyDto(
                entity.Id,
                entity.DutyDate,
                entity.UserId,
                user.DisplayName,
                entity.SeasonId,
                season.SeasonNumber
            );

            return Ok(dto);
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
    }

    public record OrganizerDutyDto(
        long Id,
        DateTime DutyDate,
        long UserId,
        string UserDisplayName,
        long SeasonId,
        int SeasonDisplayNumber
    );

    public class CreateOrganizerDutyRequest
    {
        [Required]
        public DateTime DutyDate { get; set; }

        [Required]
        [Display(Name = "user_id")]
        public long UserId { get; set; }

        [Required]
        [Display(Name = "season_id")]
        public int SeasonId { get; set; }
    }

}
