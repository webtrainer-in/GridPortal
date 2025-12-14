using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Data.Common;

namespace WebAPI.Data;

/// <summary>
/// Factory implementation for creating ApplicationDbContext instances connected to different databases.
/// </summary>
public class DbContextFactory : IDbContextFactory
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DbContextFactory> _logger;

    public DbContextFactory(
        IConfiguration configuration,
        ILogger<DbContextFactory> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Gets the connection string for the specified database.
    /// Falls back to DefaultConnection if database name is null or not found.
    /// </summary>
    public string GetConnectionString(string? databaseName = null)
    {
        // If no database name specified, use default
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            var defaultConnection = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(defaultConnection))
            {
                throw new InvalidOperationException("DefaultConnection not found in configuration");
            }
            return defaultConnection;
        }

        // Try to get named connection string
        var connectionString = _configuration.GetConnectionString(databaseName);

        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.LogWarning(
                "Connection string '{DatabaseName}' not found. Falling back to DefaultConnection",
                databaseName);

            connectionString = _configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("DefaultConnection not found in configuration");
            }
        }
        else
        {
            _logger.LogDebug(
                "Using connection string for database: {DatabaseName}",
                databaseName);
        }

        return connectionString;
    }

    /// <summary>
    /// Creates an ApplicationDbContext connected to the specified database.
    /// </summary>
    public ApplicationDbContext CreateContext(string? databaseName = null)
    {
        var connectionString = GetConnectionString(databaseName);

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        _logger.LogInformation(
            "Creating DbContext for database: {DatabaseName}",
            databaseName ?? "DefaultConnection");

        return new ApplicationDbContext(optionsBuilder.Options);
    }

    /// <summary>
    /// Creates and opens a database connection to the specified database.
    /// </summary>
    public async Task<DbConnection> CreateConnectionAsync(string? databaseName = null)
    {
        var connectionString = GetConnectionString(databaseName);

        var connection = new NpgsqlConnection(connectionString);

        _logger.LogInformation(
            "Opening connection to database: {DatabaseName}",
            databaseName ?? "DefaultConnection");

        await connection.OpenAsync();

        return connection;
    }
}
