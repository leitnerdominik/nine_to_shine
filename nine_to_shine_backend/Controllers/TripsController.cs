using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NineToShineApi.Data;
using NineToShineApi.Models;

namespace NineToShineApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TripsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TripSummaryDto>>> GetAll(CancellationToken ct)
    {
        var trips = await _db.Trips
            .AsNoTracking()
            .OrderByDescending(trip => trip.OccurredAt)
            .ThenByDescending(trip => trip.Id)
            .Select(trip => new TripSummaryDto(
                trip.Id,
                trip.Name,
                trip.OccurredAt,
                trip.SeasonId,
                trip.Transactions.Sum(finance =>
                    finance.Direction == "expense" ? finance.Amount : -finance.Amount)))
            .ToListAsync(ct);

        return Ok(trips);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TripDetailsDto>> GetById(long id, CancellationToken ct)
    {
        var trip = await LoadTrip(id, asTracking: false, ct);
        return trip is null ? NotFound() : Ok(ToDetailsDto(trip));
    }

    [HttpPost]
    public async Task<ActionResult<TripDetailsDto>> Create(
        [FromBody] CreateTripRequest body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (!body.OccurredAt.HasValue)
            return BadRequest(new { error = "occurredAt is required." });
        if (body.OccurredAt.Value.Kind != DateTimeKind.Utc)
            return BadRequest(new { error = "occurredAt must be a UTC timestamp." });
        if (!body.SeasonId.HasValue)
            return BadRequest(new { error = "seasonId is required." });

        var name = body.Name.Trim();
        if (name.Length == 0)
            return BadRequest(new { error = "name must not be blank." });

        var seasonExists = await _db.Season.AnyAsync(season => season.Id == body.SeasonId.Value, ct);
        if (!seasonExists) return BadRequest(new { error = "season_id not found." });

        var splitError = await ValidateSplit(body, ct);
        if (splitError is not null) return splitError;

        var trip = new Trip
        {
            OccurredAt = body.OccurredAt.Value,
            Name = name,
            SeasonId = body.SeasonId.Value
        };
        var created = CreateSplitRows(trip, body);

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        _db.Trips.Add(trip);
        _db.Finance.AddRange(created);
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var details = await LoadTrip(trip.Id, asTracking: false, ct);
        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, ToDetailsDto(details!));
    }

    [HttpPost("{id:long}/splits")]
    public async Task<ActionResult<IEnumerable<FinanceDto>>> AddSplit(
        long id,
        [FromBody] TripSplitRequest body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var trip = await LockTripForUpdate(id, ct);
        if (trip is null) return NotFound();

        var splitError = await ValidateSplit(body, ct);
        if (splitError is not null) return splitError;

        var created = CreateSplitRows(trip, body);
        _db.Finance.AddRange(created);
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(await GetFinanceDtos(created.Select(finance => finance.Id).ToList(), ct));
    }

    [HttpPut("{id:long}/splits")]
    public async Task<ActionResult<IEnumerable<FinanceDto>>> ReplaceSplit(
        long id,
        [FromBody] ReplaceTripSplitByIdRequest body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var referenceError = ValidateVersionReferences(body.Transactions);
        if (referenceError is not null) return referenceError;

        var ids = body.Transactions.Select(reference => reference.Id).ToList();
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var trip = await LockTripForUpdate(id, ct);
        if (trip is null) return NotFound();

        var splitError = await ValidateSplit(body, ct);
        if (splitError is not null) return splitError;

        var referencedRows = await _db.Finance
            .Where(finance => ids.Contains(finance.Id))
            .ToListAsync(ct);

        if (referencedRows.Count != body.Transactions.Count)
            return FinanceConflict();
        if (referencedRows.Any(finance => finance.Category != "TRIP" || finance.TripId != id))
            return BadRequest(new { error = "Only transactions from this trip can be replaced." });

        var groupDirection = referencedRows[0].Direction;
        var groupDescription = referencedRows[0].Description;
        if (referencedRows.Any(finance =>
                finance.Direction != groupDirection ||
                finance.Description != groupDescription))
        {
            return BadRequest(new { error = "Transactions must belong to one booking group." });
        }

        var bookingRows = await _db.Finance
            .Where(finance =>
                finance.TripId == id &&
                finance.Direction == groupDirection &&
                finance.Description == groupDescription)
            .ToListAsync(ct);
        if (!VersionsMatch(bookingRows, body.Transactions)) return FinanceConflict();

        var created = CreateSplitRows(trip, body);
        try
        {
            _db.Finance.RemoveRange(bookingRows);
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

    [HttpPut("{id:long}/splits/batch")]
    public async Task<ActionResult<IEnumerable<FinanceDto>>> ReplaceSplitsBatch(
        long id,
        [FromBody] ReplaceTripSplitsByIdRequest body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var references = body.Splits.SelectMany(split => split.Transactions).ToList();
        var referenceError = ValidateVersionReferences(references);
        if (referenceError is not null) return referenceError;

        var ids = references.Select(reference => reference.Id).ToList();
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var trip = await LockTripForUpdate(id, ct);
        if (trip is null) return NotFound();

        foreach (var split in body.Splits)
        {
            var splitError = await ValidateSplit(ToSplitRequest(body.UserIds, split), ct);
            if (splitError is not null) return splitError;
        }

        var referencedRows = ids.Count == 0
            ? []
            : await _db.Finance.Where(finance => ids.Contains(finance.Id)).ToListAsync(ct);

        if (referencedRows.Count != references.Count)
            return FinanceConflict();
        if (referencedRows.Any(finance => finance.Category != "TRIP" || finance.TripId != id))
            return BadRequest(new { error = "Only transactions from this trip can be replaced." });

        var existing = await _db.Finance.Where(finance => finance.TripId == id).ToListAsync(ct);
        if (!VersionsMatch(existing, references)) return FinanceConflict();

        var created = body.Splits
            .SelectMany(split => CreateSplitRows(trip, ToSplitRequest(body.UserIds, split)))
            .ToList();

        try
        {
            if (existing.Count > 0) _db.Finance.RemoveRange(existing);
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

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id,
        [FromBody] FinanceVersionReferencesRequest body,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var referenceError = ValidateVersionReferences(body.Transactions);
        if (referenceError is not null) return referenceError;

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var trip = await LockTripForUpdate(id, ct);
        if (trip is null) return NotFound();

        var referenceIds = body.Transactions.Select(reference => reference.Id).ToList();
        var referencedRows = await _db.Finance
            .Where(finance => referenceIds.Contains(finance.Id))
            .ToListAsync(ct);
        if (referencedRows.Count != body.Transactions.Count) return FinanceConflict();
        if (referencedRows.Any(finance => finance.Category != "TRIP" || finance.TripId != id))
        {
            return BadRequest(new
            {
                error = "Transactions must belong to the selected trip."
            });
        }

        var rows = await _db.Finance.Where(finance => finance.TripId == id).ToListAsync(ct);
        if (!VersionsMatch(rows, body.Transactions)) return FinanceConflict();

        try
        {
            _db.Finance.RemoveRange(rows);
            await _db.SaveChangesAsync(ct);
            _db.Trips.Remove(trip);
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

    private async Task<Trip?> LockTripForUpdate(long id, CancellationToken ct)
    {
        return await _db.Trips
            .FromSqlInterpolated($"SELECT * FROM trip WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct);
    }

    private async Task<Trip?> LoadTrip(long id, bool asTracking, CancellationToken ct)
    {
        var query = _db.Trips
            .Include(trip => trip.Transactions)
                .ThenInclude(finance => finance.User)
            .Include(trip => trip.Transactions)
                .ThenInclude(finance => finance.Game)
            .AsSplitQuery();

        if (!asTracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(trip => trip.Id == id, ct);
    }

    private async Task<ActionResult?> ValidateSplit(ITripSplitRequest body, CancellationToken ct)
    {
        var direction = body.Direction.ToLowerInvariant();
        if (direction != "income" && direction != "expense")
            return BadRequest(new { error = "Direction must be 'income' or 'expense'." });
        if (!IsValidMoneyAmount(body.Amount))
            return BadRequest(new { error = "Amount must be between 0.01 and 1000000 with at most two decimal places." });
        if (body.UserIds.Count == 0)
            return BadRequest(new { error = "userIds must contain at least one user." });

        var userIds = body.UserIds.Distinct().ToList();
        if (userIds.Count != body.UserIds.Count)
            return BadRequest(new { error = "userIds must not contain duplicates." });
        if (decimal.ToInt64(body.Amount * 100m) < userIds.Count)
            return BadRequest(new { error = "Amount is too small to split across all selected users." });

        var existingUsers = await _db.Users.CountAsync(user => userIds.Contains(user.Id), ct);
        return existingUsers == userIds.Count
            ? null
            : BadRequest(new { error = "All userIds must refer to existing users." });
    }

    private List<Finance> CreateSplitRows(Trip trip, ITripSplitRequest body)
    {
        var shares = SplitAmountInCents(body.Amount, body.UserIds);
        var rows = shares.Select(entry => new Finance
        {
            Trip = trip.Id == 0 ? trip : null,
            TripId = trip.Id == 0 ? null : trip.Id,
            OccurredAt = trip.OccurredAt,
            Direction = body.Direction.ToLowerInvariant(),
            Amount = entry.Value,
            Category = "TRIP",
            Description = body.Description,
            UserId = entry.Key,
            SeasonId = trip.SeasonId
        }).ToList();

        return rows;
    }

    private async Task<List<FinanceDto>> GetFinanceDtos(IReadOnlyCollection<long> ids, CancellationToken ct)
    {
        return await _db.Finance
            .AsNoTracking()
            .Include(finance => finance.User)
            .Include(finance => finance.Game)
            .Where(finance => ids.Contains(finance.Id))
            .OrderBy(finance => finance.UserId)
            .Select(finance => new FinanceDto(
                finance.Id,
                finance.OccurredAt,
                finance.Direction,
                finance.Amount,
                finance.Category,
                finance.Description,
                finance.UserId,
                finance.User != null ? finance.User.DisplayName : null,
                finance.SeasonId,
                finance.GameId,
                finance.Game != null ? finance.Game.GameName : null,
                finance.TripId,
                finance.UpdatedAt))
            .ToListAsync(ct);
    }

    private static TripDetailsDto ToDetailsDto(Trip trip) => new(
        trip.Id,
        trip.Name,
        trip.OccurredAt,
        trip.SeasonId,
        trip.Transactions
            .OrderBy(finance => finance.UserId)
            .ThenBy(finance => finance.Id)
            .Select(finance => new FinanceDto(
                finance.Id,
                finance.OccurredAt,
                finance.Direction,
                finance.Amount,
                finance.Category,
                finance.Description,
                finance.UserId,
                finance.User?.DisplayName,
                finance.SeasonId,
                finance.GameId,
                finance.Game?.GameName,
                finance.TripId,
                finance.UpdatedAt))
            .ToList());

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
        var expected = references.ToDictionary(
            reference => reference.Id,
            reference => reference.UpdatedAt!.Value.UtcDateTime);
        return rows.All(row => expected.TryGetValue(row.Id, out var version) && row.UpdatedAt == version);
    }

    private ConflictObjectResult FinanceConflict() => Conflict(new
    {
        error = "Finance data changed after it was loaded. Reload and try again."
    });

    private static IReadOnlyDictionary<long, decimal> SplitAmountInCents(
        decimal totalAmount,
        IReadOnlyCollection<long> userIds)
    {
        var sortedUserIds = userIds.OrderBy(id => id).ToList();
        var totalCents = decimal.ToInt64(totalAmount * 100m);
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

    private static bool IsValidMoneyAmount(decimal amount) =>
        amount >= 0.01m &&
        amount <= 1_000_000m &&
        amount == decimal.Round(amount, 2);

    private static TripSplitRequest ToSplitRequest(
        List<long> userIds,
        TripSplitByIdBatchEntryRequest split) => new()
        {
            Direction = split.Direction,
            Amount = split.Amount,
            Description = split.Description,
            UserIds = userIds
        };
}

public record TripSummaryDto(
    long Id,
    string Name,
    DateTime OccurredAt,
    long? SeasonId,
    decimal TotalAmount);

public record TripDetailsDto(
    long Id,
    string Name,
    DateTime OccurredAt,
    long? SeasonId,
    IReadOnlyCollection<FinanceDto> Transactions);

public interface ITripSplitRequest
{
    string Direction { get; }
    decimal Amount { get; }
    string? Description { get; }
    List<long> UserIds { get; }
}

public class CreateTripRequest : TripSplitRequest
{
    [Required]
    public DateTime? OccurredAt { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Range(1, long.MaxValue)]
    public long? SeasonId { get; set; }
}

public class TripSplitRequest : ITripSplitRequest
{
    [Required]
    [RegularExpression("income|expense", ErrorMessage = "Direction must be 'income' or 'expense'")]
    public string Direction { get; set; } = "expense";

    [Range(0.01, 1000000)]
    public decimal Amount { get; set; }

    public string? Description { get; set; }

    [Required]
    [MinLength(1)]
    public List<long> UserIds { get; set; } = [];
}

public class ReplaceTripSplitByIdRequest : TripSplitRequest
{
    [Required]
    [MinLength(1)]
    public List<FinanceVersionReference> Transactions { get; set; } = [];
}

public class ReplaceTripSplitsByIdRequest
{
    [Required]
    [MinLength(1)]
    public List<long> UserIds { get; set; } = [];

    [Required]
    [MinLength(1)]
    public List<TripSplitByIdBatchEntryRequest> Splits { get; set; } = [];
}

public class TripSplitByIdBatchEntryRequest
{
    [Required]
    public List<FinanceVersionReference> Transactions { get; set; } = [];

    [Required]
    [RegularExpression("income|expense", ErrorMessage = "Direction must be 'income' or 'expense'")]
    public string Direction { get; set; } = "expense";

    [Range(0.01, 1000000)]
    public decimal Amount { get; set; }

    public string? Description { get; set; }
}
