namespace NineToShineApi.Models
{
    public class Game
    {
        public long Id { get; set; }

        public long SeasonId { get; set; }
        public Season Season { get; set; } = null!;

        public DateTime PlayedAt { get; set; }
        public string GameName { get; set; } = string.Empty;

        public long OrganizedByUserId { get; set; }
        public User OrganizedByUser { get; set; } = null!;
    }
}
