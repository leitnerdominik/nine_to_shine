using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260907120000_EnforceRankingPointsRange")]
public partial class EnforceRankingPointsRange : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_rank_points_nonneg",
            table: "rankings");

        // Preserve legacy scores accepted by the former API while enforcing the
        // range for every new or updated row. The constraint can be validated in
        // a later migration after historical outliers are reviewed explicitly.
        migrationBuilder.Sql(
            """
            ALTER TABLE rankings
            ADD CONSTRAINT ck_rank_points_range
            CHECK (points >= 0 AND points <= 10) NOT VALID;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_rank_points_range",
            table: "rankings");

        migrationBuilder.AddCheckConstraint(
            name: "ck_rank_points_nonneg",
            table: "rankings",
            sql: "points >= 0");
    }
}
