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
                    f.SeasonId, f.GameId, f.Game != null ? f.Game.GameName : null,
                    f.UpdatedAt
                ))
                .ToListAsync(ct);

            return Ok(list);
        }

        // GET: api/finance/dues-status?seasonId=1
        [HttpGet("dues-status")]
        public async Task<ActionResult<IEnumerable<GameDuesStatusDto>>> GetDuesStatus(
            [FromQuery] long? seasonId,
            CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var gamesQuery = _db.Game
                .AsNoTracking()
                .Where(g => g.PlayedAt <= now);

            if (seasonId.HasValue)
                gamesQuery = gamesQuery.Where(g => g.SeasonId == seasonId.Value);

            var games = await gamesQuery
                .OrderByDescending(g => g.PlayedAt)
                .Select(g => new
                {
                    g.Id,
                    g.SeasonId,
                    g.PlayedAt,
                    g.GameName
                })
                .ToListAsync(ct);

            if (games.Count == 0)
                return Ok(Array.Empty<GameDuesStatusDto>());

            var activeMembers = await _db.Users
                .AsNoTracking()
                .Where(u => u.IsActive)
                .OrderBy(u => u.DisplayName)
                .ThenBy(u => u.Id)
                .Select(u => new
                {
                    u.Id,
                    u.DisplayName
                })
                .ToListAsync(ct);

            var gameIds = games.Select(g => g.Id).ToList();
            var activeMemberIds = activeMembers.Select(u => u.Id).ToList();
            var paidPairs = activeMemberIds.Count == 0
                ? []
                : await _db.Finance
                    .AsNoTracking()
                    .Where(f =>
                        f.GameId.HasValue && gameIds.Contains(f.GameId.Value) &&
                        f.UserId.HasValue && activeMemberIds.Contains(f.UserId.Value) &&
                        f.Direction == "income" &&
                        f.Category == "DUES" &&
                        f.Amount > 0)
                    .Select(f => new { GameId = f.GameId!.Value, UserId = f.UserId!.Value })
                    .Distinct()
                    .ToListAsync(ct);

            var paidLookup = paidPairs
                .Select(pair => (pair.GameId, pair.UserId))
                .ToHashSet();

            var result = games.Select(game =>
            {
                var unpaidMembers = activeMembers
                    .Where(member => !paidLookup.Contains((game.Id, member.Id)))
                    .Select(member => new UnpaidDuesMemberDto(member.Id, member.DisplayName))
                    .ToList();

                return new GameDuesStatusDto(
                    game.Id,
                    game.SeasonId,
                    game.PlayedAt,
                    game.GameName,
                    activeMembers.Count,
                    activeMembers.Count - unpaidMembers.Count,
                    unpaidMembers
                );
            }).ToList();

            return Ok(result);
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

        // Der Saldo aller Mitgliedskonten zusammen (ohne Vereinskasse)
        [HttpGet("balance/members")]
        public async Task<ActionResult<decimal>> GetMembersBalance(CancellationToken ct)
        {
            var q = _db.Finance.AsNoTracking().Where(f => f.UserId != null);

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
                f.Game?.GameName,
                f.UpdatedAt
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
                gameName,
                entity.UpdatedAt
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

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var entity = await _db.Finance.FindAsync(new object[] { id }, ct);
            if (entity is null) return NotFound();

            if (!body.UpdatedAt.HasValue ||
                !MatchesExpectedVersion(entity, body.UpdatedAt.Value))
            {
                return FinanceConflict();
            }

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

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

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
                gameName,
                entity.UpdatedAt
            ));
        }

        // DELETE: api/finance/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(
            long id,
            [FromQuery, Required] DateTimeOffset? updatedAt,
            CancellationToken ct)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var entity = await _db.Finance.FindAsync(new object[] { id }, ct);
            if (entity is null) return NotFound();

            if (!updatedAt.HasValue || !MatchesExpectedVersion(entity, updatedAt.Value))
                return FinanceConflict();

            try
            {
                _db.Finance.Remove(entity);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

            return NoContent();
        }

        // POST: api/finance/bulk-delete
        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete(
            [FromBody] FinanceVersionReferencesRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var duplicateError = ValidateVersionReferences(body.Transactions);
            if (duplicateError is not null) return duplicateError;

            var ids = body.Transactions.Select(reference => reference.Id).ToList();
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var rows = await _db.Finance
                .Where(finance => ids.Contains(finance.Id))
                .ToListAsync(ct);

            if (!VersionsMatch(rows, body.Transactions)) return FinanceConflict();

            try
            {
                _db.Finance.RemoveRange(rows);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

            return NoContent();
        }

        // DELETE: api/finance/by-game/5
        // Löscht alle Transaktionen eines bestimmten Spiels
        [HttpDelete("by-game/{gameId:long}")]
        public async Task<IActionResult> DeleteByGameId(
            long gameId,
            [FromBody] FinanceVersionReferencesRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var duplicateError = ValidateVersionReferences(body.Transactions);
            if (duplicateError is not null) return duplicateError;

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var transactions = await _db.Finance
                .Where(f => f.GameId == gameId)
                .ToListAsync(ct);

            if (!transactions.Any())
            {
                return NotFound();
            }

            if (!VersionsMatch(transactions, body.Transactions)) return FinanceConflict();

            try
            {
                _db.Finance.RemoveRange(transactions);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

            return NoContent();
        }

        // PUT: api/finance/game/5/deposits/replace
        // Ersetzt die vom Einzahlungsformular verwalteten Einnahmen atomar.
        [HttpPut("game/{gameId:long}/deposits/replace")]
        public async Task<ActionResult<IEnumerable<FinanceDto>>> ReplaceGameDeposits(
            long gameId,
            [FromBody] ReplaceGameDepositsRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var game = await _db.Game
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == gameId, ct);
            if (game is null) return NotFound(new { error = "game_id not found." });

            if (!body.OccurredAt.HasValue)
                return BadRequest(new { error = "occurredAt is required." });

            var duplicateError = ValidateVersionReferences(body.Transactions);
            if (duplicateError is not null) return duplicateError;

            var transactionIds = body.Transactions
                .Select(reference => reference.Id)
                .ToList();

            var memberIds = body.Members.Select(member => member.UserId).Distinct().ToList();
            if (memberIds.Count != body.Members.Count)
                return BadRequest(new { error = "members must not contain duplicate userIds." });

            if (body.Members.Any(member =>
                    !IsValidMoneyAmount(member.MemberAmount, allowZero: true) ||
                    !IsValidMoneyAmount(member.ClubAmount, allowZero: true) ||
                    (member.MemberAmount == 0 && member.ClubAmount == 0)))
            {
                return BadRequest(new
                {
                    error = "Member and club amounts must be non-negative, have at most two decimal places, and at least one amount must be greater than 0."
                });
            }

            if (body.OtherIncomes.Any(income =>
                    !IsValidMoneyAmount(income.Amount, allowZero: false)))
            {
                return BadRequest(new
                {
                    error = "Other income amounts must be greater than 0 and have at most two decimal places."
                });
            }

            var members = await _db.Users
                .AsNoTracking()
                .Where(user => memberIds.Contains(user.Id))
                .Select(user => new { user.Id, user.DisplayName })
                .ToListAsync(ct);

            if (members.Count != memberIds.Count)
                return BadRequest(new { error = "All member userIds must refer to existing users." });

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var existingTransactions = transactionIds.Count == 0
                ? []
                : await _db.Finance
                    .Where(finance => transactionIds.Contains(finance.Id))
                    .ToListAsync(ct);

            if (!VersionsMatch(existingTransactions, body.Transactions))
                return FinanceConflict();

            if (existingTransactions.Any(finance =>
                    finance.GameId != gameId ||
                    finance.Direction != "income" ||
                    (finance.Category != "DUES" &&
                     (finance.Category != "OTHER" || finance.UserId != null))))
            {
                return BadRequest(new
                {
                    error = "Only DUES income and anonymous OTHER income for this game can be replaced."
                });
            }

            var memberNames = members.ToDictionary(member => member.Id, member => member.DisplayName);
            var created = new List<Finance>();
            var occurredAt = body.OccurredAt.Value;

            foreach (var member in body.Members)
            {
                var note = string.IsNullOrWhiteSpace(member.Description)
                    ? null
                    : member.Description.Trim();
                var description = note is null
                    ? "Mitgliedsbeitrag"
                    : $"Mitgliedsbeitrag - {note}";

                if (member.MemberAmount > 0)
                {
                    created.Add(new Finance
                    {
                        OccurredAt = occurredAt,
                        Direction = "income",
                        Amount = member.MemberAmount,
                        Category = "DUES",
                        Description = description,
                        UserId = member.UserId,
                        SeasonId = game.SeasonId,
                        GameId = game.Id
                    });
                }

                if (member.ClubAmount > 0)
                {
                    created.Add(new Finance
                    {
                        OccurredAt = occurredAt,
                        Direction = "income",
                        Amount = member.ClubAmount,
                        Category = "DUES",
                        Description = $"{description} ({memberNames[member.UserId]})",
                        UserId = null,
                        SeasonId = game.SeasonId,
                        GameId = game.Id
                    });
                }
            }

            created.AddRange(body.OtherIncomes.Select(income => new Finance
            {
                OccurredAt = occurredAt,
                Direction = "income",
                Amount = income.Amount,
                Category = "OTHER",
                Description = string.IsNullOrWhiteSpace(income.Description)
                    ? "Sonstige Einnahme"
                    : income.Description.Trim(),
                UserId = null,
                SeasonId = game.SeasonId,
                GameId = game.Id
            }));

            try
            {
                if (existingTransactions.Count > 0)
                    _db.Finance.RemoveRange(existingTransactions);
                if (created.Count > 0)
                    _db.Finance.AddRange(created);

                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

            return Ok(await GetFinanceDtos(created.Select(finance => finance.Id).ToList(), ct));
        }

        // DELETE: api/finance/trip/by-date?date=2023-01-01
        // Löscht alle TRIP-Transaktionen eines bestimmten Tages
        [HttpDelete("trip/by-date")]
        public async Task<IActionResult> DeleteTripsByDate(
            [FromQuery] DateTime date,
            [FromBody] FinanceVersionReferencesRequest body,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var duplicateError = ValidateVersionReferences(body.Transactions);
            if (duplicateError is not null) return duplicateError;

            var start = date.Date;
            var end = start.AddDays(1);

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var transactions = await _db.Finance
                .Where(f => f.Category == "TRIP" && f.OccurredAt >= start && f.OccurredAt < end)
                .ToListAsync(ct);

            if (!transactions.Any())
            {
                return NotFound();
            }

            if (!VersionsMatch(transactions, body.Transactions)) return FinanceConflict();

            try
            {
                _db.Finance.RemoveRange(transactions);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

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

            if (body.Transactions.Count == 0)
                return BadRequest(new { error = "transactions must contain at least one transaction." });

            var validationResult = await ValidateTripSplitRequest(body, ct);
            if (validationResult is not null) return validationResult;

            var duplicateError = ValidateVersionReferences(body.Transactions);
            if (duplicateError is not null) return duplicateError;

            var transactionIds = body.Transactions
                .Select(reference => reference.Id)
                .ToList();

            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var existingTransactions = await _db.Finance
                .Where(f => transactionIds.Contains(f.Id))
                .ToListAsync(ct);

            if (!VersionsMatch(existingTransactions, body.Transactions))
                return FinanceConflict();

            if (existingTransactions.Any(f => f.Category != "TRIP"))
                return BadRequest(new { error = "Only TRIP transactions can be replaced by this endpoint." });

            var created = CreateTripSplitRows(body);
            try
            {
                _db.Finance.RemoveRange(existingTransactions);
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return FinanceConflict();
            }

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
                    f.Game != null ? f.Game.GameName : null,
                    f.UpdatedAt
                ))
                .ToListAsync(ct);
        }

        private BadRequestObjectResult? ValidateVersionReferences(
            IReadOnlyCollection<FinanceVersionReference> references)
        {
            if (references.Any(reference => !reference.UpdatedAt.HasValue))
                return BadRequest(new { error = "Every transaction must include updatedAt." });

            if (references.Select(reference => reference.Id).Distinct().Count() != references.Count)
                return BadRequest(new { error = "Transactions must not contain duplicate ids." });

            return null;
        }

        private static bool VersionsMatch(
            IReadOnlyCollection<Finance> rows,
            IReadOnlyCollection<FinanceVersionReference> references)
        {
            if (rows.Count != references.Count) return false;

            var expectedVersions = references.ToDictionary(
                reference => reference.Id,
                reference => reference.UpdatedAt!.Value.UtcDateTime);

            return rows.All(row =>
                expectedVersions.TryGetValue(row.Id, out var expected) &&
                row.UpdatedAt == expected);
        }

        private static bool MatchesExpectedVersion(
            Finance row,
            DateTimeOffset expectedVersion) =>
            row.UpdatedAt == expectedVersion.UtcDateTime;

        private ConflictObjectResult FinanceConflict() =>
            Conflict(new
            {
                error = "Finance data changed after it was loaded. Reload and try again."
            });

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

        private static bool IsValidMoneyAmount(decimal amount, bool allowZero)
        {
            var minimum = allowZero ? 0m : 0.01m;
            return amount >= minimum &&
                   amount <= 1_000_000m &&
                   amount == decimal.Round(amount, 2);
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
        string? GameName,
        DateTime UpdatedAt
    );

    public record UnpaidDuesMemberDto(
        long UserId,
        string DisplayName
    );

    public record GameDuesStatusDto(
        long GameId,
        long SeasonId,
        DateTime PlayedAt,
        string GameName,
        int ActiveMemberCount,
        int PaidMemberCount,
        IReadOnlyList<UnpaidDuesMemberDto> UnpaidMembers
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
        [Required]
        public DateTimeOffset? UpdatedAt { get; set; }

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
        public List<FinanceVersionReference> Transactions { get; set; } = [];
    }

    public class ReplaceGameDepositsRequest
    {
        [Required]
        public List<FinanceVersionReference> Transactions { get; set; } = [];

        [Required]
        public DateTime? OccurredAt { get; set; }

        [Required]
        public List<GameDepositMemberRequest> Members { get; set; } = [];

        [Required]
        public List<GameDepositOtherIncomeRequest> OtherIncomes { get; set; } = [];
    }

    public class GameDepositMemberRequest
    {
        [Required]
        public long UserId { get; set; }

        public decimal MemberAmount { get; set; }

        public decimal ClubAmount { get; set; }

        public string? Description { get; set; }
    }

    public class GameDepositOtherIncomeRequest
    {
        public decimal Amount { get; set; }

        public string? Description { get; set; }
    }

    public class FinanceVersionReference
    {
        [Range(1, long.MaxValue)]
        public long Id { get; set; }

        [Required]
        public DateTimeOffset? UpdatedAt { get; set; }
    }

    public class FinanceVersionReferencesRequest
    {
        [Required]
        [MinLength(1)]
        public List<FinanceVersionReference> Transactions { get; set; } = [];
    }
}
