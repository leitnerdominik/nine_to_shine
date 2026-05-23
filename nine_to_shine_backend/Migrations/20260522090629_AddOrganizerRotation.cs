using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NineToShineApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizerRotation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_skipped",
                table: "organizer_duty",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "organizer_rotation_member",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    season_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizer_rotation_member", x => x.id);
                    table.ForeignKey(
                        name: "FK_organizer_rotation_member_season_season_id",
                        column: x => x.season_id,
                        principalTable: "season",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_organizer_rotation_member_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql("""
                INSERT INTO organizer_rotation_member (season_id, user_id, sort_order)
                SELECT season_id, user_id, sort_order
                FROM (
                    SELECT
                        season_id,
                        user_id,
                        ROW_NUMBER() OVER (
                            PARTITION BY season_id
                            ORDER BY first_duty_date, user_id
                        )::integer AS sort_order
                    FROM (
                        SELECT season_id, user_id, MIN(duty_date) AS first_duty_date
                        FROM organizer_duty
                        GROUP BY season_id, user_id
                    ) existing_members
                ) seeded_rotation;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_organizer_rotation_member_season_id",
                table: "organizer_rotation_member",
                column: "season_id");

            migrationBuilder.CreateIndex(
                name: "IX_organizer_rotation_member_season_id_sort_order",
                table: "organizer_rotation_member",
                columns: new[] { "season_id", "sort_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organizer_rotation_member_season_id_user_id",
                table: "organizer_rotation_member",
                columns: new[] { "season_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organizer_rotation_member_user_id",
                table: "organizer_rotation_member",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "organizer_rotation_member");

            migrationBuilder.DropColumn(
                name: "is_skipped",
                table: "organizer_duty");
        }
    }
}
