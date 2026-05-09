using NineToShineApi.Data;
using NineToShineApi.Middleware;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore.Design;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 90)
    .CreateLogger();

builder.Host.UseSerilog();

// Configure Kestrel to listen on HTTP only:
builder.WebHost.UseUrls("http://localhost:5006");

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

builder.Services.AddHealthChecks();

// Configure PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

Console.WriteLine($"ContentRoot Path: {builder.Environment.ContentRootPath}");
Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");
Console.WriteLine("ConnectionString: " + builder.Configuration.GetConnectionString("DefaultConnection"));

// Enable CORS (for frontend access)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    policy
        .WithOrigins("http://localhost:3000", "https://ninetoshine.xyz")
        //.AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});


string? projectId = builder.Configuration["Firebase:ProjectId"];
string authority = $"https://securetoken.google.com/{projectId}";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authority,

            ValidateAudience = true,
            ValidAudience = projectId,

            ValidateLifetime = true
            // Signatur/Keys werden automatisch �ber Authority (OpenID config) bezogen
        };

        // Lokal ohne HTTPS-Metadaten?
        options.RequireHttpsMetadata = false;
    });
builder.Services.AddAuthorization();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("DevOnline"))
{
    app.UseSwagger();
    app.UseSwaggerUI();

    Console.WriteLine($"Running in {app.Environment.EnvironmentName}");
}
else if (app.Environment.IsProduction())
{
    Console.WriteLine("Running in Production");
}

app.UseCors("AllowFrontend");
//app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<RequestLoggingMiddleware>();

app.MapHealthChecks("/api/health");
app.MapControllers();


try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            await db.Database.MigrateAsync(); // ensures DB & runs all migrations
            app.Logger.LogInformation("Datenbankmigration erfolgreich.");
            Console.WriteLine("Datenbankmigration erfolgreich.");
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "DB-Migration fehlgeschlagen");
            Console.WriteLine($"DB-Migration fehlgeschlagen: {ex.Message}");
        }
    }

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            var can = await db.Database.CanConnectAsync();
            if (can)
            {
                app.Logger.LogInformation("Verbunden mit Datenbank");
                Console.WriteLine("Verbunden mit Datenbank");
            }
            else
            {
                app.Logger.LogError("Keine Verbindung zur Datenbank");
                Console.WriteLine("Keine Verbindung zur Datenbank");
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "DB-Check fehlgeschlagen");
            Console.WriteLine($"DB-Check fehlgeschlagen: {ex.Message}");
        }
    }


    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}