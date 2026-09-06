using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NineToShineApi.Data;

#nullable disable

namespace NineToShineApi.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260906120000_AddStableTripIds")]
public partial class AddStableTripIds : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "trip",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                season_id = table.Column<long>(type: "bigint", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_trip", x => x.id);
                table.ForeignKey(
                    name: "FK_trip_season_season_id",
                    column: x => x.season_id,
                    principalTable: "season",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.AddColumn<long>(
            name: "trip_id",
            table: "finance",
            type: "bigint",
            nullable: true);

        migrationBuilder.Sql("""
            WITH legacy_groups AS (
                SELECT
                    occurred_at,
                    (array_agg(
                        "Id"
                        ORDER BY
                            CASE WHEN "Description" LIKE '%(Anreise/Unterkunft)%' THEN 0 ELSE 1 END,
                            "Id"
                    ))[1] AS source_id,
                    CASE
                        WHEN COUNT(DISTINCT season_id) = 1 THEN MIN(season_id)
                        ELSE NULL
                    END AS season_id
                FROM finance
                WHERE category = 'TRIP'
                GROUP BY occurred_at
            ), inserted_trips AS (
                INSERT INTO trip (occurred_at, name, season_id)
                SELECT
                    legacy_groups.occurred_at,
                    left(
                        COALESCE(
                            NULLIF(
                                btrim(
                                    regexp_replace(
                                        regexp_replace(
                                            regexp_replace(
                                                COALESCE(source."Description", 'Unbenannter Trip'),
                                                '\s?\((Anreise/Unterkunft|Aktivität)\)',
                                                '',
                                                'g'
                                            ),
                                            '\s?\(Aktivität.*?\)',
                                            '',
                                            'g'
                                        ),
                                        '\s?\((Ausgabe|Einnahme).*?\)',
                                        '',
                                        'g'
                                    )
                                ),
                                ''
                            ),
                            'Unbenannter Trip'
                        ),
                        200
                    ),
                    legacy_groups.season_id
                FROM legacy_groups
                JOIN finance AS source ON source."Id" = legacy_groups.source_id
                RETURNING id, occurred_at
            )
            UPDATE finance
            SET trip_id = inserted_trips.id
            FROM inserted_trips
            WHERE finance.category = 'TRIP'
              AND finance.occurred_at = inserted_trips.occurred_at;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_trip_occurred_at",
            table: "trip",
            column: "occurred_at");

        migrationBuilder.CreateIndex(
            name: "IX_trip_season_id",
            table: "trip",
            column: "season_id");

        migrationBuilder.CreateIndex(
            name: "IX_finance_trip_id",
            table: "finance",
            column: "trip_id");

        migrationBuilder.AddForeignKey(
            name: "FK_finance_trip_trip_id",
            table: "finance",
            column: "trip_id",
            principalTable: "trip",
            principalColumn: "id",
            onDelete: ReferentialAction.Cascade);

        migrationBuilder.AddCheckConstraint(
            name: "ck_finance_trip_link",
            table: "finance",
            sql: "(category = 'TRIP' AND trip_id IS NOT NULL) OR (category <> 'TRIP' AND trip_id IS NULL)");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_finance_trip_trip_id", table: "finance");
        migrationBuilder.DropCheckConstraint(name: "ck_finance_trip_link", table: "finance");
        migrationBuilder.DropIndex(name: "IX_finance_trip_id", table: "finance");
        migrationBuilder.DropColumn(name: "trip_id", table: "finance");
        migrationBuilder.DropTable(name: "trip");
    }
}
