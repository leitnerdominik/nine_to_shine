namespace NineToShineApi.Models
{
    public class User
    {
        public long Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Game> OrganizedGames { get; set; } = new List<Game>();
    }
}
