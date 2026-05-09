using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NineToShineApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "season",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    season_number = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_season", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    display_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "game",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    season_id = table.Column<long>(type: "bigint", nullable: false),
                    played_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    game_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    organized_by_user_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game", x => x.id);
                    table.ForeignKey(
                        name: "FK_game_season_season_id",
                        column: x => x.season_id,
                        principalTable: "season",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_game_users_organized_by_user_id",
                        column: x => x.organized_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "organizer_duty",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    duty_date = table.Column<DateTime>(type: "date", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    season_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizer_duty", x => x.id);
                    table.ForeignKey(
                        name: "FK_organizer_duty_season_season_id",
                        column: x => x.season_id,
                        principalTable: "season",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organizer_duty_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "rankings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    game_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    points = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_present = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rankings", x => x.id);
                    table.CheckConstraint("ck_rank_points_nonneg", "points >= 0");
                    table.ForeignKey(
                        name: "FK_rankings_game_game_id",
                        column: x => x.game_id,
                        principalTable: "game",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rankings_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "finance",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    direction = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    season_id = table.Column<long>(type: "bigint", nullable: true),
                    penalty_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_finance", x => x.Id);
                    table.CheckConstraint("ck_finance_amount_pos", "amount > 0");
                    table.CheckConstraint("ck_finance_direction", "direction IN ('income','expense')");
                    table.ForeignKey(
                        name: "FK_finance_season_season_id",
                        column: x => x.season_id,
                        principalTable: "season",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_finance_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "penalty",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    SeasonId = table.Column<long>(type: "bigint", nullable: false),
                    PenaltyType = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    AssessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    PaidFinanceId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_penalty", x => x.Id);
                    table.ForeignKey(
                        name: "FK_penalty_finance_PaidFinanceId",
                        column: x => x.PaidFinanceId,
                        principalTable: "finance",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_penalty_season_SeasonId",
                        column: x => x.SeasonId,
                        principalTable: "season",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_penalty_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_finance_category",
                table: "finance",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "IX_finance_direction",
                table: "finance",
                column: "direction");

            migrationBuilder.CreateIndex(
                name: "IX_finance_occurred_at",
                table: "finance",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "IX_finance_penalty_id",
                table: "finance",
                column: "penalty_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_finance_season_id",
                table: "finance",
                column: "season_id");

            migrationBuilder.CreateIndex(
                name: "IX_finance_user_id",
                table: "finance",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_game_game_name",
                table: "game",
                column: "game_name");

            migrationBuilder.CreateIndex(
                name: "IX_game_organized_by_user_id",
                table: "game",
                column: "organized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_game_played_at",
                table: "game",
                column: "played_at");

            migrationBuilder.CreateIndex(
                name: "IX_game_season_id",
                table: "game",
                column: "season_id");

            migrationBuilder.CreateIndex(
                name: "IX_organizer_duty_duty_date",
                table: "organizer_duty",
                column: "duty_date");

            migrationBuilder.CreateIndex(
                name: "IX_organizer_duty_season_id",
                table: "organizer_duty",
                column: "season_id");

            migrationBuilder.CreateIndex(
                name: "IX_organizer_duty_user_id",
                table: "organizer_duty",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_penalty_AssessedAt",
                table: "penalty",
                column: "AssessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_penalty_PaidFinanceId",
                table: "penalty",
                column: "PaidFinanceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_penalty_PenaltyType",
                table: "penalty",
                column: "PenaltyType");

            migrationBuilder.CreateIndex(
                name: "IX_penalty_SeasonId",
                table: "penalty",
                column: "SeasonId");

            migrationBuilder.CreateIndex(
                name: "IX_penalty_UserId",
                table: "penalty",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_rankings_game_id",
                table: "rankings",
                column: "game_id");

            migrationBuilder.CreateIndex(
                name: "IX_rankings_game_id_user_id",
                table: "rankings",
                columns: new[] { "game_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rankings_user_id",
                table: "rankings",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_season_season_number",
                table: "season",
                column: "season_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_finance_penalty_penalty_id",
                table: "finance",
                column: "penalty_id",
                principalTable: "penalty",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_finance_penalty_penalty_id",
                table: "finance");

            migrationBuilder.DropTable(
                name: "organizer_duty");

            migrationBuilder.DropTable(
                name: "rankings");

            migrationBuilder.DropTable(
                name: "game");

            migrationBuilder.DropTable(
                name: "penalty");

            migrationBuilder.DropTable(
                name: "finance");

            migrationBuilder.DropTable(
                name: "season");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
