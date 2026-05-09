namespace NineToShineApi.Models
{
    public class Season
    {
        public long Id { get; set; }
        public int SeasonNumber { get; set; }
        public ICollection<Game> Games { get; set; } = new List<Game>();
    }
}
