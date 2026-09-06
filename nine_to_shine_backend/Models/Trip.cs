namespace NineToShineApi.Models;

public class Trip
{
    public long Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? SeasonId { get; set; }
    public Season? Season { get; set; }
    public ICollection<Finance> Transactions { get; set; } = new List<Finance>();
}
