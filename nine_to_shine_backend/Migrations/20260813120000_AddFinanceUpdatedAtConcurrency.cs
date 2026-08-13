using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260813120000_AddFinanceUpdatedAtConcurrency")]
    public partial class AddFinanceUpdatedAtConcurrency : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "finance",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("UPDATE finance SET updated_at = now() WHERE updated_at IS NULL;");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updated_at",
                table: "finance",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION set_finance_updated_at()
                RETURNS trigger AS $$
                BEGIN
                    NEW.updated_at := GREATEST(
                        clock_timestamp(),
                        OLD.updated_at + interval '1 microsecond'
                    );
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER trg_finance_set_updated_at
                BEFORE UPDATE ON finance
                FOR EACH ROW
                EXECUTE FUNCTION set_finance_updated_at();
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS trg_finance_set_updated_at ON finance;
                DROP FUNCTION IF EXISTS set_finance_updated_at();
                """);

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "finance");
        }
    }
}
