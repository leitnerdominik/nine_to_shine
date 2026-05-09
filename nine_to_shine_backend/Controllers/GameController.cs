using System.ComponentModel.DataAnnotations;
using NineToShineApi.Data;
using NineToShineApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace NineToShineApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GameController : ControllerBase
    {
        private readonly AppDbContext _db;
        public GameController(AppDbContext db) => _db = db;

        // GET: api/game?seasonId=1&gameName=Tennis
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GameDto>>> GetAll([FromQuery] long? seasonId, [FromQuery] string? gameName, CancellationToken ct = default)
        {
            IQueryable<Game> q = _db.Game
                .AsNoTracking()
                .Include(g => g.OrganizedByUser)
                .OrderByDescending(g => g.PlayedAt)
                .AsQueryable();

            if (seasonId.HasValue)
                q = q.Where(g => g.SeasonId == seasonId.Value);
            if (!string.IsNullOrWhiteSpace(gameName))
                q = q.Where(g => g.GameName == gameName);

            List<GameDto> list = await q
                .Select(g => new GameDto(
                    g.Id,
                    g.SeasonId,
                    g.PlayedAt,
                    g.GameName,
                    g.OrganizedByUserId,
                    g.OrganizedByUser.DisplayName
                ))
                .ToListAsync(ct);

            return Ok(list);
        }

        // GET: api/game/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<GameDto>> GetById(long id, CancellationToken ct)
        {
            var g = await _db.Game
                .AsNoTracking()
                .Include(x => x.OrganizedByUser)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (g is null)
                return NotFound();

            return Ok(new GameDto(
                g.Id,
                g.SeasonId,
                g.PlayedAt,
                g.GameName,
                g.OrganizedByUserId,
                g.OrganizedByUser.DisplayName
            ));
        }

        // POST: api/game
        [HttpPost]
        public async Task<ActionResult<GameDto>> Create([FromBody] CreateGameRequest body, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            bool seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            User? organizer = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == body.OrganizedByUserId, ct);

            if (organizer is null)
                return BadRequest(new { error = "organized_by_user_id not found." });

            Game entity = new Game
            {
                SeasonId = body.SeasonId,
                PlayedAt = body.PlayedAt ?? DateTime.UtcNow,
                GameName = body.GameName.Trim(),
                OrganizedByUserId = body.OrganizedByUserId,
            };

            _db.Game.Add(entity);
            await _db.SaveChangesAsync(ct);

            GameDto dto = new GameDto(
                entity.Id,
                entity.SeasonId,
                entity.PlayedAt,
                entity.GameName,
                entity.OrganizedByUserId,
                organizer.DisplayName
            );

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
        }

        // DELETE: api/game/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entity = await _db.Game.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return NotFound();

            // Durch FK ON DELETE CASCADE in rankings werden zugehörige Einträge automatisch gelöscht.
            _db.Game.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // PUT: api/game/123
        [HttpPut("{id:long}")]
        public async Task<ActionResult<GameDto>> Update(
            long id,
            [FromBody] CreateGameRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            // Spiel laden
            var entity = await _db.Game.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null)
                return NotFound();

            // Season prüfen
            var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
            if (!seasonExists)
                return BadRequest(new { error = "season_id not found." });

            // Organizer prüfen
            var organizerExists = await _db.Users.AnyAsync(u => u.Id == body.OrganizedByUserId, ct);
            if (!organizerExists)
                return BadRequest(new { error = "organized_by_user_id not found." });

            // Felder aktualisieren
            entity.SeasonId = body.SeasonId;
            entity.GameName = body.GameName.Trim();
            entity.OrganizedByUserId = body.OrganizedByUserId;

            // Datum nur überschreiben, wenn mitgeschickt
            if (body.PlayedAt.HasValue)
                entity.PlayedAt = body.PlayedAt.Value;

            await _db.SaveChangesAsync(ct);

            var dto = await _db.Game
                .AsNoTracking()
                .Where(g => g.Id == entity.Id)
                .Select(g => new GameDto(
            g.Id,
            g.SeasonId,
            g.PlayedAt,
            g.GameName,
            g.OrganizedByUserId,
            g.OrganizedByUser.DisplayName
        ))
        .FirstAsync(ct);

            return Ok(dto);
        }

        // GET: api/game/with-bookings
        [HttpGet("with-bookings")]
        public async Task<ActionResult<IEnumerable<GameDto>>> GetGamesWithBookings(CancellationToken ct)
        {
            var games = await _db.Game
                .AsNoTracking()
                .Where(g => _db.Finance.Any(f => f.GameId == g.Id))
                .OrderByDescending(g => g.PlayedAt) 
                .Select(g => new GameDto(
                    g.Id,
                    g.SeasonId,
                    g.PlayedAt,
                    g.GameName,
                    g.OrganizedByUserId,
                    g.OrganizedByUser.DisplayName
                ))
                .ToListAsync(ct);

            return Ok(games);
        }
    }

    public record GameDto(
    long Id,
    long SeasonId,
    DateTime PlayedAt,
    string GameName,
    long OrganizedByUserId,
    string OrganizedByDisplayName
);

    public class CreateGameRequest
    {
        [Required]
        [Display(Name = "season_id")]
        public long SeasonId { get; set; }

        public DateTime? PlayedAt { get; set; }

        [Required]
        public string GameName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "organized_by_user_id")]
        public long OrganizedByUserId { get; set; }
    }
}
