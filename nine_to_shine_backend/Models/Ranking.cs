namespace NineToShineApi.Models
{
    public class Ranking
    {
        public long Id { get; set; }
        public long GameId { get; set; }
        public long UserId { get; set; }
        public int Points { get; set; } = 0;
        public bool IsPresent { get; set; } = true;
    }
}
