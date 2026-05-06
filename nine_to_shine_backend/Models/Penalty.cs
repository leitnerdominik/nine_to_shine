namespace NineToShineApi.Models
{
    public class Penalty // todo leidom bearbeiten
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public long SeasonId { get; set; }
        public string PenaltyType { get; set; } = string.Empty; // z.B. 'LATE'
        public decimal Amount { get; set; }
        public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
        public long? PaidFinanceId { get; set; } // -> finance.id (falls bezahlt)
    }
}
