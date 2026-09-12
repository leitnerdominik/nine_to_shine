using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260912170000_EnforceGameFinanceSeasonConsistency")]
public partial class EnforceGameFinanceSeasonConsistency : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE finance AS f
            SET season_id = g.season_id
            FROM game AS g
            WHERE f.game_id = g.id
              AND f.season_id IS DISTINCT FROM g.season_id;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_game_id_season_id",
            table: "game",
            columns: new[] { "id", "season_id" },
            unique: true);

        migrationBuilder.AddCheckConstraint(
            name: "ck_finance_game_requires_season",
            table: "finance",
            sql: "game_id IS NULL OR season_id IS NOT NULL");

        migrationBuilder.Sql("""
            ALTER TABLE finance ADD CONSTRAINT "FK_finance_game_game_id_season_id"
                FOREIGN KEY (game_id, season_id) REFERENCES game (id, season_id)
                ON UPDATE CASCADE ON DELETE SET NULL (game_id);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE finance DROP CONSTRAINT IF EXISTS "FK_finance_game_game_id_season_id";
            """);

        migrationBuilder.DropCheckConstraint(
            name: "ck_finance_game_requires_season",
            table: "finance");

        migrationBuilder.DropIndex(
            name: "IX_game_id_season_id",
            table: "game");
    }
}
