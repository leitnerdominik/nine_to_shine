using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260912160000_PreserveHistoricalOrganizerDutyAssignments")]
public partial class PreserveHistoricalOrganizerDutyAssignments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            UPDATE organizer_duty
            SET is_manual_override = TRUE
            WHERE duty_date < DATE '2026-10-01'
              AND is_manual_override = FALSE;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Intentionally irreversible: reconciled history cannot be distinguished
        // from manual overrides saved after this migration has been applied.
    }
}
