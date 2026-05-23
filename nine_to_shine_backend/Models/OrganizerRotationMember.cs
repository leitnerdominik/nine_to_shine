using System.ComponentModel.DataAnnotations.Schema;

namespace NineToShineApi.Models
{
    public class OrganizerRotationMember
    {
        public long Id { get; set; }

        [ForeignKey("SeasonId")]
        public long SeasonId { get; set; }
        public Season Season { get; set; } = null!;

        [ForeignKey("UserId")]
        public long UserId { get; set; }
        public User User { get; set; } = null!;

        public int SortOrder { get; set; }
    }
}
