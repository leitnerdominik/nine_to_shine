using NineToShineApi.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace NineToShineApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Season> Season => Set<Season>();
        public DbSet<Game> Game => Set<Game>();
        public DbSet<Ranking> Rankings => Set<Ranking>();
        public DbSet<Finance> Finance => Set<Finance>();
        public DbSet<OrganizerDuty> OrganizerDuties => Set<OrganizerDuty>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            // users
            mb.Entity<User>(e =>
            {
                e.ToTable("users");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();

                e.Property(x => x.DisplayName).HasColumnName("display_name").IsRequired();
                e.Property(x => x.Email).HasColumnName("email");
                e.HasIndex(x => x.Email).IsUnique();
                e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
                e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone")
                                            .HasDefaultValueSql("now()");
            });

            // season
            mb.Entity<Season>(e =>
            {
                e.ToTable("season");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
                e.Property(x => x.SeasonNumber).HasColumnName("season_number").IsRequired();
                e.HasIndex(x => x.SeasonNumber).IsUnique();
            });

            // game
            mb.Entity<Game>(e =>
            {
                e.ToTable("game");
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();

                e.Property(x => x.SeasonId).HasColumnName("season_id").IsRequired();
                e.Property(x => x.PlayedAt)
                    .HasColumnName("played_at")
                    .HasColumnType("timestamp with time zone")
                    .IsRequired();

                e.Property(x => x.GameName)
                    .HasColumnName("game_name")
                    .HasMaxLength(200)
                    .IsRequired();

                e.Property(x => x.OrganizedByUserId).HasColumnName("organized_by_user_id").IsRequired();

                e.HasOne(g => g.Season)
                    .WithMany(s => s.Games)
                    .HasForeignKey(g => g.SeasonId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(g => g.OrganizedByUser)
                    .WithMany(u => u.OrganizedGames)
                    .HasForeignKey(g => g.OrganizedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(x => x.SeasonId);
                e.HasIndex(x => x.PlayedAt);
                e.HasIndex(x => x.GameName);
            });

            // ranking
            mb.Entity<Ranking>(e =>
            {
                e.ToTable("rankings", tb =>
                {
                    tb.HasCheckConstraint("ck_rank_points_nonneg", "points >= 0");
                });

                e.HasKey(x => x.Id);
                e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();

                e.Property(x => x.GameId).HasColumnName("game_id").IsRequired();
                e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
                e.Property(x => x.Points).HasColumnName("points").HasDefaultValue(0);
                e.Property(x => x.IsPresent).HasColumnName("is_present").HasDefaultValue(true);

                e.HasOne<Game>()
                    .WithMany()
                    .HasForeignKey(x => x.GameId)
                    .OnDelete(DeleteBehavior.Cascade); // Löscht Rankings mit, wenn Game gelöscht wird

                e.HasOne<User>()
                    .WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Pro (game, user) nur ein Eintrag
                e.HasIndex(x => new { x.GameId, x.UserId }).IsUnique();
                e.HasIndex(x => x.UserId);
                e.HasIndex(x => x.GameId);
            });

            mb.Entity<OrganizerDuty>(e =>
            {
                e.ToTable("organizer_duty");

                e.HasKey(x => x.Id);
                e.Property(x => x.Id)
                    .HasColumnName("id")
                    .ValueGeneratedOnAdd();

                e.Property(x => x.DutyDate)
                    .HasColumnName("duty_date")
                    .HasColumnType("date")
                    .IsRequired();

                e.Property(x => x.UserId)
                    .HasColumnName("user_id")
                    .IsRequired();

                e.Property(x => x.SeasonId)
                    .HasColumnName("season_id")
                    .IsRequired();

                e.HasOne(x => x.User)
                    .WithMany() // falls du in User eine Collection willst, dort z.B. OrganizerDuties hinzufügen
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(x => x.Season)
                    .WithMany()
                    .HasForeignKey(x => x.SeasonId)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(x => x.DutyDate);
                e.HasIndex(x => x.UserId);
            });

            // finance
            mb.Entity<Finance>(e =>
            {
                e.ToTable("finance", t =>
                {
                    t.HasCheckConstraint("ck_finance_direction", "direction IN ('income','expense')");
                    t.HasCheckConstraint("ck_finance_amount_pos", "amount > 0");
                });
                e.HasKey(x => x.Id);
                e.Property(x => x.Id).ValueGeneratedOnAdd();
                e.Property(x => x.OccurredAt).HasColumnName("occurred_at").HasColumnType("timestamp with time zone");
                e.Property(x => x.Direction).HasColumnName("direction").IsRequired(); // 'income' | 'expense'
                e.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
                e.Property(x => x.Category).HasColumnName("category").IsRequired();

                e.Property(x => x.UserId).HasColumnName("user_id");
                e.Property(x => x.SeasonId).HasColumnName("season_id");
                e.Property(x => x.GameId).HasColumnName("game_id");

                e.HasOne(x => x.User).WithMany()
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                e.HasOne<Season>().WithMany()
                    .HasForeignKey(x => x.SeasonId)
                    .OnDelete(DeleteBehavior.SetNull);


                e.HasOne(x => x.Game)
                    .WithMany()
                    .HasForeignKey(x => x.GameId)
                    .OnDelete(DeleteBehavior.SetNull);



                e.HasIndex(x => x.OccurredAt);
                e.HasIndex(x => x.Direction);
                e.HasIndex(x => x.Category);
                e.HasIndex(x => x.UserId);
                e.HasIndex(x => x.SeasonId);
                e.HasIndex(x => x.GameId);
            });

            base.OnModelCreating(mb);
        }
    }
}
