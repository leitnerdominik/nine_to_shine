using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NineToShineApi.Migrations
{
    /// <inheritdoc />
    public partial class RemovePenaltyTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_finance_penalty_penalty_id",
                table: "finance");

            migrationBuilder.DropTable(
                name: "penalty");

            migrationBuilder.DropIndex(
                name: "IX_finance_penalty_id",
                table: "finance");

            migrationBuilder.DropColumn(
                name: "penalty_id",
                table: "finance");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "penalty_id",
                table: "finance",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "penalty",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    AssessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    PaidFinanceId = table.Column<long>(type: "bigint", nullable: true),
                    PenaltyType = table.Column<string>(type: "text", nullable: false),
                    SeasonId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false)
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
                name: "IX_finance_penalty_id",
                table: "finance",
                column: "penalty_id",
                unique: true);

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

            migrationBuilder.AddForeignKey(
                name: "FK_finance_penalty_penalty_id",
                table: "finance",
                column: "penalty_id",
                principalTable: "penalty",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
