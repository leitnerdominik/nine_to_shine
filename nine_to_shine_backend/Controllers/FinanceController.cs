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
    public class FinanceController : ControllerBase
    {
        private readonly AppDbContext _db;

        public FinanceController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/finance
        // Filtert Transaktionen. Wenn userId null ist, werden alle geholt (oder man könnte explizit nur globale holen).
        // Hier: "scope=global" als Parameter holt nur die Allgemein-Kosten.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FinanceDto>>> GetAll(
            [FromQuery] long? userId,
            [FromQuery] long? seasonId,
            [FromQuery] long? gameId,
            [FromQuery] string? scope,
            [FromQuery] string? direction,
            CancellationToken ct)
        {
            var q = _db.Finance
                .AsNoTracking()
                .Include(f => f.User)
                .Include(g => g.Game)
                .OrderByDescending(f => f.OccurredAt)
                .AsQueryable();

            if (userId.HasValue)
                q = q.Where(f => f.UserId == userId.Value);

            if (seasonId.HasValue)
                q = q.Where(f => f.SeasonId == seasonId.Value);

            if (gameId.HasValue)
                q = q.Where(f => f.GameId == gameId.Value);

            if (scope == "global")
                q = q.Where(f => f.UserId == null);

            if (!string.IsNullOrEmpty(direction))
            {
                var d = direction.ToLowerInvariant();
                q = q.Where(f => f.Direction == d);
            }

            var list = await q
                .Select(f => new FinanceDto(
                    f.Id, f.OccurredAt, f.Direction, f.Amount, f.Category, f.Description,
                    f.UserId, f.User != null ? f.User.DisplayName : null,
                    f.SeasonId, f.GameId, f.Game != null ? f.Game.GameName : null
                ))
                .ToListAsync(ct);

            return Ok(list);
        }

        // GET: api/finance/balance/global
        // Der reale Kassenstand des Vereins (Alle Einnahmen - Alle Ausgaben)
        [HttpGet("balance/global")]
        public async Task<ActionResult<decimal>> GetGlobalBalance(CancellationToken ct)
        {
            var income = await _db.Finance
                .AsNoTracking()
                .Where(f => f.Direction == "income")
                .SumAsync(f => f.Amount, ct);

            var expense = await _db.Finance
                .AsNoTracking()
                .Where(f => f.Direction == "expense")
                .SumAsync(f => f.Amount, ct);

            return Ok(income - expense);
        }

        // Der Saldo NUR für die Vereinskasse (ohne User-Guthaben)
        [HttpGet("balance/club")]
        public async Task<ActionResult<decimal>> GetClubBalance(CancellationToken ct)
        {
            // Filter: UserId ist NULL
            var q = _db.Finance.AsNoTracking().Where(f => f.UserId == null);

            var income = await q
                .Where(f => f.Direction == "income")
                .SumAsync(f => f.Amount, ct);

            var expense = await q
                .Where(f => f.Direction == "expense")
                .SumAsync(f => f.Amount, ct);

            return Ok(income - expense);
        }

        // GET: api/finance/balance/user/5
        // Der Saldo eines spezifischen Freundes (Was hat er eingezahlt vs. verursacht)
        [HttpGet("balance/user/{userId:long}")]
        public async Task<ActionResult<decimal>> GetUserBalance(long userId, CancellationToken ct)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == userId, ct);
            if (!userExists) return NotFound("User not found");

            var q = _db.Finance.AsNoTracking().Where(f => f.UserId == userId);

            var income = await q
                .Where(f => f.Direction == "income")
                .SumAsync(f => f.Amount, ct);

            var expense = await q
                .Where(f => f.Direction == "expense")
                .SumAsync(f => f.Amount, ct);

            return Ok(income - expense);
        }

        // GET: api/finance/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<FinanceDto>> GetById(long id, CancellationToken ct)
        {
            var f = await _db.Finance
                .AsNoTracking()
                .Include(x => x.User)
                .Include(g => g.Game)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (f is null) return NotFound();

            return Ok(new FinanceDto(
                f.Id,
                f.OccurredAt,
                f.Direction,
                f.Amount,
                f.Category,
                f.Description,
                f.UserId,
                f.User?.DisplayName,
                f.SeasonId,
                f.GameId,
                f.Game?.GameName
            ));
        }

        // POST: api/finance
        [HttpPost]
        public async Task<ActionResult<FinanceDto>> Create(
            [FromBody] CreateFinanceRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            // Validierung: Direction
            var dir = body.Direction.ToLowerInvariant();
            if (dir != "income" && dir != "expense")
                return BadRequest(new { error = "Direction must be 'income' or 'expense'." });

            if (body.Amount <= 0)
                return BadRequest(new { error = "Amount must be greater than 0." });

            if (body.UserId.HasValue)
            {
                var userExists = await _db.Users.AnyAsync(u => u.Id == body.UserId, ct);
                if (!userExists) return BadRequest(new { error = "user_id not found." });
            }

            if (body.SeasonId.HasValue)
            {
                var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
                if (!seasonExists) return BadRequest(new { error = "season_id not found." });
            }

            if (body.GameId.HasValue)
            {
                var gameExists = await _db.Game.AnyAsync(g => g.Id == body.GameId, ct);
                if (!gameExists) return BadRequest(new { error = "game_id not found." });
            }

            var entity = new Finance
            {
                OccurredAt = body.OccurredAt ?? DateTime.UtcNow,
                Direction = dir,
                Amount = body.Amount,
                Category = body.Category.ToUpperInvariant(), // z.B. "PIZZA", "DUES"
                Description = body.Description,
                UserId = body.UserId,
                SeasonId = body.SeasonId,
                GameId = body.GameId,
            };

            _db.Finance.Add(entity);
            await _db.SaveChangesAsync(ct);

            string? userDisplayName = null;
            if (entity.UserId.HasValue)
            {
                userDisplayName = await _db.Users
                    .Where(u => u.Id == entity.UserId)
                    .Select(u => u.DisplayName)
                    .FirstOrDefaultAsync(ct);
            }

            string? gameName = null;
            if (entity.GameId.HasValue)
            {
                gameName = await _db.Game
                    .Where(g => g.Id == entity.GameId)
                    .Select(g => g.GameName)
                    .FirstOrDefaultAsync(ct);
            }

            var dto = new FinanceDto(
                entity.Id,
                entity.OccurredAt,
                entity.Direction,
                entity.Amount,
                entity.Category,
                entity.Description,
                entity.UserId,
                userDisplayName,
                entity.SeasonId,
                entity.GameId,
                gameName
            );

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
        }

        // PUT: api/finance/123
        [HttpPut("{id:long}")]
        public async Task<ActionResult<FinanceDto>> Update(
            long id,
            [FromBody] UpdateFinanceRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var entity = await _db.Finance.FindAsync(new object[] { id }, ct);
            if (entity is null) return NotFound();

            var dir = body.Direction.ToLowerInvariant();
            if (dir != "income" && dir != "expense")
                return BadRequest(new { error = "Direction must be 'income' or 'expense'." });

            if (body.Amount <= 0)
                return BadRequest(new { error = "Amount must be greater than 0." });

            if (body.UserId.HasValue)
            {
                var userExists = await _db.Users.AnyAsync(u => u.Id == body.UserId, ct);
                if (!userExists) return BadRequest(new { error = "user_id not found." });
            }

            if (body.SeasonId.HasValue)
            {
                var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
                if (!seasonExists) return BadRequest(new { error = "season_id not found." });
            }

            if (body.GameId.HasValue)
            {
                var gameExists = await _db.Game.AnyAsync(g => g.Id == body.GameId, ct);
                if (!gameExists) return BadRequest(new { error = "game_id not found." });
            }

            entity.OccurredAt = body.OccurredAt ?? entity.OccurredAt;
            entity.Direction = dir;
            entity.Amount = body.Amount;
            entity.Category = body.Category.ToUpperInvariant();
            entity.Description = body.Description;
            entity.UserId = body.UserId;
            entity.SeasonId = body.SeasonId;
            entity.GameId = body.GameId;

            await _db.SaveChangesAsync(ct);

            string? userDisplayName = null;
            if (entity.UserId.HasValue)
            {
                userDisplayName = await _db.Users
                    .Where(u => u.Id == entity.UserId)
                    .Select(u => u.DisplayName)
                    .FirstOrDefaultAsync(ct);
            }

            string? gameName = null;
            if (entity.GameId.HasValue)
            {
                gameName = await _db.Game
                    .Where(g => g.Id == entity.GameId)
                    .Select(g => g.GameName)
                    .FirstOrDefaultAsync(ct);
            }

            return Ok(new FinanceDto(
                entity.Id,
                entity.OccurredAt,
                entity.Direction,
                entity.Amount,
                entity.Category,
                entity.Description,
                entity.UserId,
                userDisplayName,
                entity.SeasonId,
                entity.GameId,
                gameName
            ));
        }

        // DELETE: api/finance/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entity = await _db.Finance.FindAsync(new object[] { id }, ct);
            if (entity is null) return NotFound();

            _db.Finance.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE: api/finance/by-game/5
        // Löscht alle Transaktionen eines bestimmten Spiels
        [HttpDelete("by-game/{gameId:long}")]
        public async Task<IActionResult> DeleteByGameId(long gameId, CancellationToken ct)
        {
            var transactions = await _db.Finance
                .Where(f => f.GameId == gameId)
                .ToListAsync(ct);

            if (!transactions.Any())
            {
                return NotFound();
            }

            _db.Finance.RemoveRange(transactions);
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        // DELETE: api/finance/trip/by-date?date=2023-01-01
        // Löscht alle TRIP-Transaktionen eines bestimmten Tages
        [HttpDelete("trip/by-date")]
        public async Task<IActionResult> DeleteTripsByDate([FromQuery] DateTime date, CancellationToken ct)
        {
            var start = date.Date;
            var end = start.AddDays(1);

            var transactions = await _db.Finance
                .Where(f => f.Category == "TRIP" && f.OccurredAt >= start && f.OccurredAt < end)
                .ToListAsync(ct);

            if (!transactions.Any())
            {
                return NotFound();
            }

            _db.Finance.RemoveRange(transactions);
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        // POST: api/finance/trip/split
        // Erstellt TRIP-Buchungen und verteilt Cent-Reste deterministisch auf die niedrigsten User-IDs.
        [HttpPost("trip/split")]
        public async Task<ActionResult<IEnumerable<FinanceDto>>> CreateTripSplit(
            [FromBody] CreateTripSplitRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var validationResult = await ValidateTripSplitRequest(body, ct);
            if (validationResult is not null) return validationResult;

            var created = CreateTripSplitRows(body);
            await _db.SaveChangesAsync(ct);
            var createdDtos = await GetFinanceDtos(created.Select(f => f.Id).ToList(), ct);

            return Ok(createdDtos);
        }

        // POST: api/finance/trip/split/replace
        // Ersetzt vorhandene TRIP-Buchungen atomar durch neu gesplittete Buchungen.
        [HttpPost("trip/split/replace")]
        public async Task<ActionResult<IEnumerable<FinanceDto>>> ReplaceTripSplit(
            [FromBody] ReplaceTripSplitRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            if (body.TransactionIds.Count == 0)
                return BadRequest(new { error = "transactionIds must contain at least one transaction." });

            var validationResult = await ValidateTripSplitRequest(body, ct);
            if (validationResult is not null) return validationResult;

            var transactionIds = body.TransactionIds.Distinct().ToList();
            if (transactionIds.Count != body.TransactionIds.Count)
                return BadRequest(new { error = "transactionIds must not contain duplicates." });

            var existingTransactions = await _db.Finance
                .Where(f => transactionIds.Contains(f.Id))
                .ToListAsync(ct);

            if (existingTransactions.Count != transactionIds.Count)
                return BadRequest(new { error = "All transactionIds must refer to existing finance rows." });

            if (existingTransactions.Any(f => f.Category != "TRIP"))
                return BadRequest(new { error = "Only TRIP transactions can be replaced by this endpoint." });

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            _db.Finance.RemoveRange(existingTransactions);
            var created = CreateTripSplitRows(body);
            await _db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            var createdDtos = await GetFinanceDtos(created.Select(f => f.Id).ToList(), ct);

            return Ok(createdDtos);
        }

        private async Task<ActionResult<IEnumerable<FinanceDto>>?> ValidateTripSplitRequest(
            CreateTripSplitRequest body,
            CancellationToken ct)
        {
            var dir = body.Direction.ToLowerInvariant();
            if (dir != "income" && dir != "expense")
                return BadRequest(new { error = "Direction must be 'income' or 'expense'." });

            if (body.Amount <= 0)
                return BadRequest(new { error = "Amount must be greater than 0." });

            if (body.Amount != decimal.Round(body.Amount, 2))
                return BadRequest(new { error = "Amount must not have more than two decimal places." });

            if (body.UserIds.Count == 0)
                return BadRequest(new { error = "userIds must contain at least one user." });

            var userIds = body.UserIds.Distinct().ToList();
            if (userIds.Count != body.UserIds.Count)
                return BadRequest(new { error = "userIds must not contain duplicates." });

            var totalCents = decimal.ToInt64(body.Amount * 100m);
            if (totalCents < userIds.Count)
                return BadRequest(new { error = "Amount is too small to split across all selected users." });

            var existingUserIds = await _db.Users
                .Where(u => userIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync(ct);

            if (existingUserIds.Count != userIds.Count)
                return BadRequest(new { error = "All userIds must refer to existing users." });

            if (body.SeasonId.HasValue)
            {
                var seasonExists = await _db.Season.AnyAsync(s => s.Id == body.SeasonId, ct);
                if (!seasonExists) return BadRequest(new { error = "season_id not found." });
            }

            return null;
        }

        private List<Finance> CreateTripSplitRows(CreateTripSplitRequest body)
        {
            var sharesByUserId = SplitAmountInCents(body.Amount, body.UserIds);
            var direction = body.Direction.ToLowerInvariant();
            var occurredAt = body.OccurredAt ?? DateTime.UtcNow;

            var entities = sharesByUserId
                .Select(entry => new Finance
                {
                    OccurredAt = occurredAt,
                    Direction = direction,
                    Amount = entry.Value,
                    Category = "TRIP",
                    Description = body.Description,
                    UserId = entry.Key,
                    SeasonId = body.SeasonId
                })
                .ToList();

            _db.Finance.AddRange(entities);
            return entities;
        }

        private async Task<List<FinanceDto>> GetFinanceDtos(
            IReadOnlyCollection<long> ids,
            CancellationToken ct)
        {
            return await _db.Finance
                .AsNoTracking()
                .Include(f => f.User)
                .Include(f => f.Game)
                .Where(f => ids.Contains(f.Id))
                .OrderBy(f => f.UserId)
                .Select(f => new FinanceDto(
                    f.Id,
                    f.OccurredAt,
                    f.Direction,
                    f.Amount,
                    f.Category,
                    f.Description,
                    f.UserId,
                    f.User != null ? f.User.DisplayName : null,
                    f.SeasonId,
                    f.GameId,
                    f.Game != null ? f.Game.GameName : null
                ))
                .ToListAsync(ct);
        }

        private static IReadOnlyDictionary<long, decimal> SplitAmountInCents(
            decimal amount,
            IEnumerable<long> userIds)
        {
            var sortedUserIds = userIds.OrderBy(id => id).ToList();
            var totalCents = decimal.ToInt64(amount * 100m);
            var baseShare = totalCents / sortedUserIds.Count;
            var leftoverCents = totalCents % sortedUserIds.Count;

            return sortedUserIds
                .Select((userId, index) => new
                {
                    UserId = userId,
                    Amount = (baseShare + (index < leftoverCents ? 1 : 0)) / 100m
                })
                .ToDictionary(entry => entry.UserId, entry => entry.Amount);
        }

    }

    public record FinanceDto(
        long Id,
        DateTime OccurredAt,
        string Direction,
        decimal Amount,
        string Category,
        string? Description,
        long? UserId,
        string? UserDisplayName,
        long? SeasonId,
        long? GameId,
        string? GameName
    );

    public class CreateFinanceRequest
    {
        public DateTime? OccurredAt { get; set; }

        [Required]
        [RegularExpression("income|expense", ErrorMessage = "Direction must be 'income' or 'expense'")]
        public string Direction { get; set; } = "income";

        [Required]
        [Range(0.01, 1000000)]
        public decimal Amount { get; set; }

        [Required]
        public string Category { get; set; } = "OTHER";

        public string? Description { get; set; }

        // Optional: Wenn null, ist es eine Ausgabe für "Alle" (z.B. Pokal kaufen)
        [Display(Name = "user_id")]
        public long? UserId { get; set; }

        [Display(Name = "season_id")]
        public long? SeasonId { get; set; }

        public long? GameId { get; set; }
    }

    public class UpdateFinanceRequest
    {
        public DateTime? OccurredAt { get; set; }

        [Required]
        [RegularExpression("income|expense", ErrorMessage = "Direction must be 'income' or 'expense'")]
        public string Direction { get; set; } = "income";

        [Required]
        [Range(0.01, 1000000)]
        public decimal Amount { get; set; }

        [Required]
        public string Category { get; set; } = "OTHER";

        public string? Description { get; set; }

        [Display(Name = "user_id")]
        public long? UserId { get; set; }

        [Display(Name = "season_id")]
        public long? SeasonId { get; set; }

        public long? GameId { get; set; }
    }

    public class CreateTripSplitRequest
    {
        public DateTime? OccurredAt { get; set; }

        [Required]
        [RegularExpression("income|expense", ErrorMessage = "Direction must be 'income' or 'expense'")]
        public string Direction { get; set; } = "expense";

        [Required]
        [Range(0.01, 1000000)]
        public decimal Amount { get; set; }

        public string? Description { get; set; }

        [Display(Name = "season_id")]
        public long? SeasonId { get; set; }

        [Required]
        [MinLength(1)]
        public List<long> UserIds { get; set; } = [];
    }

    public class ReplaceTripSplitRequest : CreateTripSplitRequest
    {
        [Required]
        [MinLength(1)]
        public List<long> TransactionIds { get; set; } = [];
    }
}
