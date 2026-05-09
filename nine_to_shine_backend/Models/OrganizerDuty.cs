using System.ComponentModel.DataAnnotations.Schema;

namespace NineToShineApi.Models
{
    public class OrganizerDuty
    {
        public long Id { get; set; }

        public DateTime DutyDate { get; set; }

        [ForeignKey("UserId")]
        public long UserId { get; set; }
        public User User { get; set; } = null!;

        [ForeignKey("SeasonId")]
        public long SeasonId { get; set; }
        public Season Season { get; set; } = null!;
    }
}
