using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace WebAPI.Data;

/// <summary>
/// Factory for creating ApplicationDbContext instances connected to different databases.
/// Enables multi-database support for the dynamic grid system.
/// </summary>
public interface IDbContextFactory
{
    /// <summary>
    /// Creates an ApplicationDbContext connected to the specified database.
    /// </summary>
    /// <param name="databaseName">Database identifier (e.g., "PowerSystem", "HR"). If null, uses DefaultConnection.</param>
    /// <returns>ApplicationDbContext instance</returns>
    ApplicationDbContext CreateContext(string? databaseName = null);

    /// <summary>
    /// Creates a database connection to the specified database.
    /// </summary>
    /// <param name="databaseName">Database identifier. If null, uses DefaultConnection.</param>
    /// <returns>Open database connection</returns>
    Task<DbConnection> CreateConnectionAsync(string? databaseName = null);

    /// <summary>
    /// Gets the connection string for the specified database.
    /// </summary>
    /// <param name="databaseName">Database identifier. If null, uses DefaultConnection.</param>
    /// <returns>Connection string</returns>
    string GetConnectionString(string? databaseName = null);
}
