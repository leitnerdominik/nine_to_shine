using System.Security.Claims;

namespace NineToShineApi.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Proceed with the request pipeline first to ensure Authentication middleware runs
            await _next(context);

            var path = context.Request.Path;
            if (path.StartsWithSegments("/health") || path.StartsWithSegments("/api/health"))
            {
                return;
            }

            // Now we can check who the user was (if any) and what the result is
            var user = context.User;
            string userId = "Anonymous";
            string? userEmail = null;

            if (user.Identity?.IsAuthenticated == true)
            {
                // Try to find the user ID. 
                // In standard JWT mapping, sub maps to NameIdentifier.
                userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? user.FindFirst("user_id")?.Value 
                         ?? user.FindFirst("sub")?.Value 
                         ?? "Authenticated (Unknown ID)";

                userEmail = user.FindFirst(ClaimTypes.Email)?.Value;
            }

            // Log details
            // We use structural logging so we can query by properties if using a structured logger
            var logLevel = context.Response.StatusCode >= 500 ? LogLevel.Error : LogLevel.Information;

            string userInfo = userEmail != null ? $"{userId} ({userEmail})" : userId;

            _logger.Log(logLevel, 
                "Request: {Method} {Path} responded {StatusCode} - User: {User}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                userInfo);
        }
    }
}
