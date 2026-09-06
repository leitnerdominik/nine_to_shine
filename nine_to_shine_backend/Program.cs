using NineToShineApi.Data;
using NineToShineApi.Middleware;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;

const string ReadinessTag = "ready";

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

builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>(
        "postgresql",
        failureStatus: HealthStatus.Unhealthy,
        tags: [ReadinessTag]);

// Configure PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

Console.WriteLine($"ContentRoot Path: {builder.Environment.ContentRootPath}");
Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");

// Enable CORS (for frontend access)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    policy
        .WithOrigins("http://localhost:3000", "http://localhost:3001", "https://ninetoshine.xyz")
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

var readinessOptions = new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains(ReadinessTag)
};

app.MapHealthChecks("/api/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/api/health/ready", readinessOptions);
app.MapHealthChecks("/api/health", readinessOptions);
app.MapControllers();


try
{
    if (!app.Environment.IsEnvironment("Testing"))
    {
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await db.Database.MigrateAsync(); // ensures DB & runs all migrations
            app.Logger.LogInformation("Datenbankmigration erfolgreich.");
            Console.WriteLine("Datenbankmigration erfolgreich.");

            if (app.Environment.IsDevelopment() &&
                app.Configuration.GetValue<bool>("DevelopmentData:Seed"))
            {
                await DevelopmentDataSeeder.SeedAsync(db);
                app.Logger.LogInformation("Development-Demodaten wurden geprüft.");
            }
        }
    }

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

internal sealed class DatabaseHealthCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            return await db.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("PostgreSQL is reachable.")
                : HealthCheckResult.Unhealthy("PostgreSQL is unreachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL connectivity check failed.", ex);
        }
    }
}

public partial class Program { }
