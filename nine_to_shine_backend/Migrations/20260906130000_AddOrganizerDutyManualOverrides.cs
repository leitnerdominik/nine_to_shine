using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260906130000_AddOrganizerDutyManualOverrides")]
public partial class AddOrganizerDutyManualOverrides : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "is_manual_override",
            table: "organizer_duty",
            type: "boolean",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "is_manual_override",
            table: "organizer_duty");
    }
}
