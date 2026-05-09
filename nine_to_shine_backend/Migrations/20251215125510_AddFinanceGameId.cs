using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NineToShineApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceGameId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "game_id",
                table: "finance",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_finance_game_id",
                table: "finance",
                column: "game_id");

            migrationBuilder.AddForeignKey(
                name: "FK_finance_game_game_id",
                table: "finance",
                column: "game_id",
                principalTable: "game",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_finance_game_game_id",
                table: "finance");

            migrationBuilder.DropIndex(
                name: "IX_finance_game_id",
                table: "finance");

            migrationBuilder.DropColumn(
                name: "game_id",
                table: "finance");
        }
    }
}
