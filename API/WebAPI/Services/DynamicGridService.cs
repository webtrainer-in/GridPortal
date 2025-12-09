using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json;
using WebAPI.Data;
using WebAPI.DTOs;
using WebAPI.Models;

namespace WebAPI.Services;

public class DynamicGridService : IDynamicGridService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DynamicGridService> _logger;

    public DynamicGridService(ApplicationDbContext context, ILogger<DynamicGridService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GridDataResponse> ExecuteGridProcedureAsync(GridDataRequest request, string[] userRoles)
    {
        // Validate procedure access
        if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
        {
            throw new UnauthorizedAccessException($"Access denied to procedure: {request.ProcedureName}");
        }

        // Validate procedure name format (prevent SQL injection)
        if (!IsValidProcedureName(request.ProcedureName))
        {
            throw new ArgumentException("Invalid procedure name format");
        }

        // Validate page size
        var procedure = await _context.StoredProcedureRegistry
            .FirstOrDefaultAsync(p => p.ProcedureName == request.ProcedureName);
        
        if (procedure != null && request.PageSize > procedure.MaxPageSize)
        {
            request.PageSize = procedure.MaxPageSize;
        }

        try
        {
            // Build parameters for PostgreSQL function
            var parameters = new[]
            {
                new NpgsqlParameter("p_PageNumber", request.PageNumber),
                new NpgsqlParameter("p_PageSize", request.PageSize),
                new NpgsqlParameter("p_StartRow", (object?)request.StartRow ?? DBNull.Value),
                new NpgsqlParameter("p_EndRow", (object?)request.EndRow ?? DBNull.Value),
                new NpgsqlParameter("p_SortColumn", (object?)request.SortColumn ?? DBNull.Value),
                new NpgsqlParameter("p_SortDirection", request.SortDirection ?? "ASC"),
                new NpgsqlParameter("p_FilterJson", (object?)request.FilterJson ?? DBNull.Value),
                new NpgsqlParameter("p_SearchTerm", (object?)request.SearchTerm ?? DBNull.Value)
            };

            // Execute PostgreSQL function and get JSON result
            var sql = $"SELECT {request.ProcedureName}(@p_PageNumber, @p_PageSize, @p_StartRow, @p_EndRow, @p_SortColumn, @p_SortDirection, @p_FilterJson, @p_SearchTerm)";
            
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters);

            var jsonResult = await command.ExecuteScalarAsync();
            
            if (jsonResult == null || jsonResult == DBNull.Value)
            {
                return new GridDataResponse
                {
                    PageNumber = request.PageNumber,
                    PageSize = request.PageSize
                };
            }

            // Parse JSON response
            var jsonString = jsonResult.ToString()!;
            var jsonDoc = JsonDocument.Parse(jsonString);
            
            var response = new GridDataResponse
            {
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            };

            // Extract rows
            if (jsonDoc.RootElement.TryGetProperty("rows", out var rowsElement))
            {
                response.Rows = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
                    rowsElement.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                ) ?? new List<Dictionary<string, object>>();
            }

            // Extract columns
            if (jsonDoc.RootElement.TryGetProperty("columns", out var columnsElement))
            {
                response.Columns = JsonSerializer.Deserialize<List<ColumnDefinition>>(
                    columnsElement.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                ) ?? new List<ColumnDefinition>();
            }

            // Extract total count
            if (jsonDoc.RootElement.TryGetProperty("totalCount", out var countElement))
            {
                response.TotalCount = countElement.GetInt32();
                response.LastRow = response.TotalCount;  // For infinite scrolling
            }

            // Calculate total pages
            if (request.PageSize > 0)
            {
                response.TotalPages = (int)Math.Ceiling(response.TotalCount / (double)request.PageSize);
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing grid procedure: {ProcedureName}", request.ProcedureName);
            throw;
        }
    }

    public async Task<RowUpdateResponse> UpdateRowAsync(RowUpdateRequest request, string[] userRoles, int userId)
    {
        // Validate access to the grid procedure
        if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
        {
            throw new UnauthorizedAccessException("Access denied to update this data");
        }

        // Determine update procedure name
        var updateProcedureName = request.ProcedureName.Replace("sp_Grid_", "sp_Grid_Update_");
        
        // Validate update procedure exists and user has access
        if (!await ValidateProcedureAccessAsync(updateProcedureName, userRoles))
        {
            return new RowUpdateResponse
            {
                Success = false,
                Message = "Update not supported for this grid",
                ErrorCode = "UPDATE_NOT_SUPPORTED"
            };
        }

        try
        {
            // Convert changes dictionary to JSON
            var changesJson = JsonSerializer.Serialize(request.Changes);
            
            // Execute update function
            var sql = $"SELECT {updateProcedureName}(@p_Id, @p_ChangesJson, @p_UserId)";
            
            var parameters = new[]
            {
                new NpgsqlParameter("p_Id", request.RowId),
                new NpgsqlParameter("p_ChangesJson", changesJson),
                new NpgsqlParameter("p_UserId", userId)
            };

            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters);

            var jsonResult = await command.ExecuteScalarAsync();
            
            if (jsonResult == null || jsonResult == DBNull.Value)
            {
                return new RowUpdateResponse
                {
                    Success = false,
                    Message = "No response from update procedure"
                };
            }

            // Parse JSON response
            var jsonString = jsonResult.ToString()!;
            var response = JsonSerializer.Deserialize<RowUpdateResponse>(
                jsonString,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            return response ?? new RowUpdateResponse
            {
                Success = false,
                Message = "Failed to parse update response"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing update procedure: {ProcedureName}", updateProcedureName);
            return new RowUpdateResponse
            {
                Success = false,
                Message = "Database error occurred",
                ErrorCode = "DB_ERROR"
            };
        }
    }

    public async Task<List<StoredProcedureInfo>> GetAvailableProceduresAsync(string[] userRoles)
    {
        var procedures = await _context.StoredProcedureRegistry
            .Where(p => p.IsActive)
            .ToListAsync();

        var availableProcedures = new List<StoredProcedureInfo>();

        foreach (var proc in procedures)
        {
            // Parse allowed roles from JSON
            var allowedRoles = JsonSerializer.Deserialize<List<string>>(proc.AllowedRoles) ?? new List<string>();
            
            // Check if user has any of the allowed roles
            if (userRoles.Any(role => allowedRoles.Contains(role)))
            {
                availableProcedures.Add(new StoredProcedureInfo
                {
                    Id = proc.Id,
                    ProcedureName = proc.ProcedureName,
                    DisplayName = proc.DisplayName,
                    Description = proc.Description,
                    Category = proc.Category,
                    IsActive = proc.IsActive,
                    RequiresAuth = proc.RequiresAuth,
                    AllowedRoles = allowedRoles,
                    DefaultPageSize = proc.DefaultPageSize,
                    MaxPageSize = proc.MaxPageSize
                });
            }
        }

        return availableProcedures;
    }

    public async Task<bool> ValidateProcedureAccessAsync(string procedureName, string[] userRoles)
    {
        var procedure = await _context.StoredProcedureRegistry
            .FirstOrDefaultAsync(p => p.ProcedureName == procedureName && p.IsActive);

        if (procedure == null)
        {
            return false;
        }

        // Parse allowed roles from JSON
        var allowedRoles = JsonSerializer.Deserialize<List<string>>(procedure.AllowedRoles) ?? new List<string>();
        
        // Check if user has any of the allowed roles
        return userRoles.Any(role => allowedRoles.Contains(role));
    }

    public async Task<string?> GetColumnStateAsync(int userId, string procedureName)
    {
        var state = await _context.GridColumnStates
            .FirstOrDefaultAsync(s => s.UserId == userId && s.ProcedureName == procedureName);

        return state?.ColumnState;
    }

    public async Task SaveColumnStateAsync(int userId, string procedureName, string columnState)
    {
        var existing = await _context.GridColumnStates
            .FirstOrDefaultAsync(s => s.UserId == userId && s.ProcedureName == procedureName);

        if (existing != null)
        {
            existing.ColumnState = columnState;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.GridColumnStates.Add(new GridColumnState
            {
                UserId = userId,
                ProcedureName = procedureName,
                ColumnState = columnState
            });
        }

        await _context.SaveChangesAsync();
    }

    private bool IsValidProcedureName(string procedureName)
    {
        // Only allow alphanumeric characters and underscores
        // Must start with sp_Grid_
        return System.Text.RegularExpressions.Regex.IsMatch(
            procedureName,
            @"^sp_Grid_[a-zA-Z0-9_]+$"
        );
    }
}
