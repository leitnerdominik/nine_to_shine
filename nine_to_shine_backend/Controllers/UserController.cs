using NineToShineApi.Data;
using NineToShineApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace NineToShineApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UserController(AppDbContext db)
        {
            _db = db;
        }

        // GET: api/user
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAll(CancellationToken ct)
        {
            var users = await _db.Users
                .AsNoTracking()
                .OrderBy(u => u.Id)
                .Select(u => new UserDto(u.Id, u.DisplayName, u.Email, u.IsActive, u.CreatedAt))
                .ToListAsync(ct);

            return Ok(users);
        }

        // GET: api/user/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<UserDto>> GetById(long id, CancellationToken ct)
        {
            var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (u == null)
                return NotFound();

            return Ok(new UserDto(u.Id, u.DisplayName, u.Email, u.IsActive, u.CreatedAt));
        }

        // POST: api/user
        [HttpPost]
        public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest body, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            // einfache Email-Normalisierung
            var emailNorm = body.Email?.Trim();
            if (string.IsNullOrWhiteSpace(body.DisplayName))
                return BadRequest(new { error = "display_name is required." });

            // E-Mail uniqueness check (falls DB-Constraint vorhanden: UNIQUE)
            if (!string.IsNullOrWhiteSpace(emailNorm))
            {
                var exists = await _db.Users.AnyAsync(u => u.Email == emailNorm, ct);
                if (exists)
                    return Conflict(new { error = "Email already exists." });
            }

            var entity = new User
            {
                DisplayName = body.DisplayName.Trim(),
                Email = emailNorm,
                IsActive = body.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(entity);
            await _db.SaveChangesAsync(ct);

            var dto = new UserDto(entity.Id, entity.DisplayName, entity.Email, entity.IsActive, entity.CreatedAt);

            // Location-Header auf GET by id
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
        }

        // DELETE: api/user/123
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entity = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity == null) return NotFound();

            _db.Users.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }

    public record UserDto(long Id, string DisplayName, string? Email, bool IsActive, DateTime CreatedAt);

    public class CreateUserRequest
    {
        [Required]
        [Display(Name = "display_name")]
        public string DisplayName { get; set; } = string.Empty;

        [EmailAddress]
        public string? Email { get; set; }

        public bool? IsActive { get; set; } // optional, default true
    }
}
