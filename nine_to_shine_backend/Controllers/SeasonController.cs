using System.ComponentModel.DataAnnotations;
using NineToShineApi.Data;
using NineToShineApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Npgsql;

namespace NineToShineApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SeasonController : ControllerBase
    {
        private readonly AppDbContext _db;
        public SeasonController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/season
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SeasonDto>>> GetAll(CancellationToken ct)
        {
            var items = await _db.Season
                .AsNoTracking()
                .OrderBy(s => s.SeasonNumber)
                .Select(s => new SeasonDto(s.Id, s.SeasonNumber))
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET: api/season/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<SeasonDto>> GetById(long id, CancellationToken ct)
        {
            var s = await _db.Season.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (s is null) return NotFound();
            return Ok(new SeasonDto(s.Id, s.SeasonNumber));
        }

        // POST: api/season
        [HttpPost]
        public async Task<ActionResult<SeasonDto>> Create([FromBody] CreateSeasonRequest body, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            // Eindeutigkeit der SeasonNumber prüfen (optional, falls DB-Unique-Index vorhanden)
            var exists = await _db.Season.AnyAsync(s => s.SeasonNumber == body.SeasonNumber, ct);
            if (exists) return Conflict(new { error = "season_number already exists." });

            var entity = new Season { SeasonNumber = body.SeasonNumber };
            _db.Season.Add(entity);
            await _db.SaveChangesAsync(ct);

            var dto = new SeasonDto(entity.Id, entity.SeasonNumber);
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
        }

        // DELETE: api/season/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entity = await _db.Season.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return NotFound();

            var dependencies = await GetDeleteDependencies(id, ct);

            if (dependencies.Count > 0)
                return SeasonDeleteConflict(dependencies);

            _db.Season.Remove(entity);
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException exception) when (
                exception.InnerException is PostgresException
                {
                    SqlState: PostgresErrorCodes.ForeignKeyViolation
                })
            {
                return SeasonDeleteConflict(await GetDeleteDependencies(id, ct));
            }

            return NoContent();
        }

        private async Task<List<string>> GetDeleteDependencies(long id, CancellationToken ct)
        {
            var dependencies = new List<string>();
            if (await _db.Game.AnyAsync(x => x.SeasonId == id, ct))
                dependencies.Add("games");
            if (await _db.OrganizerDuties.AnyAsync(x => x.SeasonId == id, ct))
                dependencies.Add("organizer duties");

            return dependencies;
        }

        private ConflictObjectResult SeasonDeleteConflict(IReadOnlyCollection<string> dependencies)
        {
            var error = dependencies.Count == 0
                ? "Season cannot be deleted because dependent data exists."
                : $"Season cannot be deleted because it is referenced by: {string.Join(", ", dependencies)}.";

            return Conflict(new
            {
                error,
                dependencies
            });
        }
    }

    public record SeasonDto(long Id, int SeasonNumber);

    public class CreateSeasonRequest
    {
        [Required]
        [Display(Name = "season_number")]
        public int SeasonNumber { get; set; }
    }
}
