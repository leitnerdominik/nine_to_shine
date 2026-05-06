namespace NineToShineApi.Models
{
    public class Finance // todo leidom bearbeiten
    {
        public long Id { get; set; }
        public DateTime OccurredAt { get; set; } // Pflicht beim Insert setzen
        public string Direction { get; set; } = "income"; // 'income' | 'expense'
        public decimal Amount { get; set; }
        public string Category { get; set; } = "OTHER";   // z.B. 'FINE', 'DUES'
        public string? Description { get; set; }
        public long? UserId { get; set; }
        public User? User { get; set; }
        public long? SeasonId { get; set; }
        public long? GameId { get; set; }
        public Game? Game { get; set; }
    }
}
