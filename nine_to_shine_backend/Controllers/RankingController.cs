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
    public class RankingController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RankingController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/ranking?seasonId=1&gameId=10&gameName=Tennis
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RankingDto>>> GetAll(
            [FromQuery] long? seasonId,
            [FromQuery] long? gameId,
            [FromQuery] string? gameName,
            CancellationToken ct = default)
        {
            var q = this._db.Rankings
                .AsNoTracking()
                .OrderBy(r => r.Id)
                .Select(r => new
                {
                    r.Id,
                    r.GameId,
                    r.UserId,
                    r.Points,
                    r.IsPresent,
                    Game = _db.Game.Where(g => g.Id == r.GameId).Select(g => new { g.SeasonId, g.GameName, g.PlayedAt, g.OrganizedByUserId }).First()
                })
                .AsQueryable();

            if (gameId.HasValue)
                q = q.Where(x => x.GameId == gameId.Value);
            if (seasonId.HasValue) 
                q = q.Where(x => x.Game.SeasonId == seasonId.Value);
            if (!string.IsNullOrWhiteSpace(gameName)) 
                q = q.Where(x => x.Game.GameName == gameName);

            var items = await q.Select(x =>
                new RankingDto(x.Id, x.GameId, x.UserId, x.Points,
                               x.Game.SeasonId, x.Game.GameName, x.Game.PlayedAt, x.IsPresent))
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET: api/ranking/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<RankingDto>> GetById(long id, CancellationToken ct)
        {
            var r = await _db.Rankings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (r is null) 
                return NotFound();

            var g = await _db.Game.AsNoTracking().FirstOrDefaultAsync(x => x.Id == r.GameId, ct);
            if (g is null) 
                return Problem("Game not found for ranking.", statusCode: 500);

            return Ok(new RankingDto(r.Id, r.GameId, r.UserId, r.Points, g.SeasonId, g.GameName, g.PlayedAt, r.IsPresent));
        }

        // GET: api/ranking/top?seasonId=1
        // Returns the user(s) with the highest total points for a given season (or all time if seasonId is null).
        [HttpGet("top")]
        public async Task<ActionResult<TopRankedDto>> GetTopRanked(
            [FromQuery] long? seasonId,
            CancellationToken ct)
        {
            var q = _db.Rankings.AsNoTracking();

            if (seasonId.HasValue)
            {
                // Join needed to filter by season via Game
                q = q.Where(r => _db.Game.Any(g => g.Id == r.GameId && g.SeasonId == seasonId.Value));
            }

            // Group by User and Sum Points
            var userPoints = await q
                .GroupBy(r => r.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalPoints = g.Sum(r => r.Points)
                })
                .OrderByDescending(x => x.TotalPoints)
                .FirstOrDefaultAsync(ct);

            if (userPoints == null)
            {
                return Ok(null); // No rankings found
            }

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userPoints.UserId, ct);

            return Ok(new TopRankedDto(
                userPoints.UserId,
                user?.DisplayName ?? "Unknown",
                userPoints.TotalPoints
            ));
        }

        // POST: api/ranking
        [HttpPost]
        public async Task<ActionResult<RankingDto>> Create([FromBody] CreateRankingRequest body, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            // Referenzen prüfen
            var game = await _db.Game.AsNoTracking().FirstOrDefaultAsync(g => g.Id == body.GameId, ct);
            if (game is null)
                return BadRequest(new { error = "game_id not found." });

            var userExists = await _db.Users.AnyAsync(u => u.Id == body.UserId, ct);
            if (!userExists)
                return BadRequest(new { error = "user_id not found." });

            // Ein User darf pro Spiel nur 1 Ranking haben (UNIQUE(game_id, user_id) in DB empfohlen)
            var dup = await _db.Rankings.AnyAsync(r => r.GameId == body.GameId && r.UserId == body.UserId, ct);
            if (dup) 
                return Conflict(new { error = "Ranking for this (game_id, user_id) already exists." });

            var entity = new Ranking
            {
                GameId = body.GameId,
                UserId = body.UserId,
                Points = body.Points,
                IsPresent = body.IsPresent ?? true
            };

            _db.Rankings.Add(entity);
            await _db.SaveChangesAsync(ct);

            var dto = new RankingDto(entity.Id, entity.GameId, entity.UserId, entity.Points, game.SeasonId, game.GameName, game.PlayedAt, entity.IsPresent);
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
        }

        // DELETE: api/ranking/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entity = await _db.Rankings.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return NotFound();

            _db.Rankings.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // PUT: api/ranking/123
        [HttpPut("{id:long}")]
        public async Task<ActionResult<RankingDto>> Update(
            long id,
            [FromBody] UpdateRankingRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var entity = await _db.Rankings.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (entity is null)
                return NotFound();

            // Punkte & Anwesenheit aktualisieren
            entity.Points = body.Points;
            if (body.IsPresent.HasValue)
                entity.IsPresent = body.IsPresent.Value;

            await _db.SaveChangesAsync(ct);

            // Game laden für DTO (wie bei GetById)
            var g = await _db.Game.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == entity.GameId, ct);

            if (g is null)
                return Problem("Game not found for ranking.", statusCode: 500);

            var dto = new RankingDto(
                entity.Id,
                entity.GameId,
                entity.UserId,
                entity.Points,
                g.SeasonId,
                g.GameName,
                g.PlayedAt,
                entity.IsPresent
            );

            return Ok(dto);
        }

        // DELETE: api/ranking/by-game/123
        [HttpDelete("by-game/{gameId:long}")]
        public async Task<IActionResult> DeleteByGame(long gameId, CancellationToken ct)
        {
            var rankings = await _db.Rankings
                .Where(r => r.GameId == gameId)
                .ToListAsync(ct);

            if (rankings.Count == 0)
                return NoContent(); // nichts zu löschen, aber OK

            _db.Rankings.RemoveRange(rankings);
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }
    }

    // ===== DTOs / Requests =====

    public record RankingDto(
        long Id,
        long GameId,
        long UserId,
        int Points,
        long SeasonId,
        string GameName,
        DateTime PlayedAt,
        bool IsPresent
    );

    public record TopRankedDto(
        long UserId,
        string UserDisplayName,
        int TotalPoints
    );

    public class CreateRankingRequest
    {
        [Required]
        [Display(Name = "game_id")]
        public long GameId { get; set; }

        [Required]
        [Display(Name = "user_id")]
        public long UserId { get; set; }

        [Range(0, int.MaxValue)]
        public int Points { get; set; }
        public bool? IsPresent { get; set; }
    }

    public class UpdateRankingRequest
    {
        [Range(0, 10)]
        public int Points { get; set; }

        public bool? IsPresent { get; set; }
    }
}
