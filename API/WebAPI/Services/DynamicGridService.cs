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
    private readonly IDbContextFactory _dbContextFactory;
    private readonly ILogger<DynamicGridService> _logger;

    public DynamicGridService(
        ApplicationDbContext context,
        IDbContextFactory dbContextFactory,
        ILogger<DynamicGridService> logger)
    {
        _context = context;
        _dbContextFactory = dbContextFactory;
        _logger = logger;
    }

    public async Task<GridDataResponse> ExecuteGridProcedureAsync(GridDataRequest request, string[] userRoles)
    {
        // Get procedure metadata for database routing
        var procedure = await _context.StoredProcedureRegistry
            .FirstOrDefaultAsync(p => p.ProcedureName == request.ProcedureName && p.IsActive);

        if (procedure == null)
        {
            throw new Exception($"Procedure not found or inactive: {request.ProcedureName}");
        }

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

        // Get database name from procedure metadata
        var databaseName = procedure.DatabaseName;

        _logger.LogInformation(
            "Executing procedure {ProcedureName} on database {DatabaseName}",
            request.ProcedureName,
            databaseName ?? "DefaultConnection");

        // Validate page size - REMOVED: Frontend controls this via paginationThreshold
        // var procedure = await _context.StoredProcedureRegistry
        //     .FirstOrDefaultAsync(p => p.ProcedureName == request.ProcedureName);
        // 
        // if (procedure != null && request.PageSize > procedure.MaxPageSize)
        // {
        //     request.PageSize = procedure.MaxPageSize;
        // }

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
            
            // Create connection to target database using factory
            var connection = await _dbContextFactory.CreateConnectionAsync(databaseName);

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters);

            var jsonResult = await command.ExecuteScalarAsync();
            
            // Close connection
            await connection.DisposeAsync();
            
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
        _logger.LogInformation("UpdateRowAsync called - ProcedureName: {ProcedureName}, RowId: {RowId}, UserId: {UserId}", 
            request.ProcedureName, request.RowId, userId);
        _logger.LogInformation("User roles: {Roles}", string.Join(", ", userRoles));
        
        // Validate access to the grid procedure
        if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
        {
            _logger.LogWarning("Access denied to grid procedure: {ProcedureName}", request.ProcedureName);
            throw new UnauthorizedAccessException("Access denied to update this data");
        }

        // Determine update procedure name dynamically
        // e.g., sp_Grid_Example_Employees -> sp_Grid_Update_Employee
        // e.g., sp_Grid_Buses -> sp_Grid_Update_Bus
        var updateProcedureName = DeriveUpdateProcedureName(request.ProcedureName);
        _logger.LogInformation("Derived update procedure name: {UpdateProcedureName}", updateProcedureName);
        
        // Get update procedure metadata for database routing
        var updateProcedure = await _context.StoredProcedureRegistry
            .FirstOrDefaultAsync(p => p.ProcedureName == updateProcedureName && p.IsActive);
        
        if (updateProcedure == null)
        {
            _logger.LogWarning("Update procedure not found or inactive: {UpdateProcedureName}", updateProcedureName);
            return new RowUpdateResponse
            {
                Success = false,
                Message = "Update not supported for this grid",
                ErrorCode = "UPDATE_NOT_SUPPORTED"
            };
        }
        
        // Validate user has access to update procedure
        var hasUpdateAccess = await ValidateProcedureAccessAsync(updateProcedureName, userRoles);
        if (!hasUpdateAccess)
        {
            _logger.LogWarning("Access denied to update procedure: {UpdateProcedureName}", updateProcedureName);
            return new RowUpdateResponse
            {
                Success = false,
                Message = "Access denied to update this data",
                ErrorCode = "ACCESS_DENIED"
            };
        }
        
        var databaseName = updateProcedure.DatabaseName;
        _logger.LogInformation("Executing update on database: {DatabaseName}", databaseName ?? "DefaultConnection");

        try
        {
            // Convert changes dictionary to JSON
            var changesJson = JsonSerializer.Serialize(request.Changes);
            
            // Dynamically determine parameter type based on ID format
            string parameterName;
            NpgsqlParameter idParameter;
            string rowIdString;
            
            // Convert RowId to string
            if (request.RowId is System.Text.Json.JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    rowIdString = jsonElement.GetInt32().ToString();
                }
                else
                {
                    rowIdString = jsonElement.GetString() ?? "";
                }
            }
            else
            {
                rowIdString = request.RowId?.ToString() ?? "";
            }
            
            _logger.LogInformation("RowId as string: {RowId}", rowIdString);
            
            // Extract entity name from update procedure for parameter naming
            var entityName = updateProcedureName.Replace("sp_Grid_Update_", "");
            
            if (rowIdString.Contains("_"))
            {
                // Composite key format (e.g., "101_1") - use TEXT parameter
                parameterName = $"p_{entityName}Id";
                idParameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Text) 
                { 
                    Value = rowIdString 
                };
                _logger.LogInformation("Using TEXT parameter for composite key: {ParameterName} = {Value}", 
                    parameterName, rowIdString);
            }
            else if (int.TryParse(rowIdString, out int intId))
            {
                // Simple integer ID - use INTEGER parameter
                parameterName = "p_Id";  // Keep standard name for backward compatibility
                idParameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Integer) 
                { 
                    Value = intId 
                };
                _logger.LogInformation("Using INTEGER parameter: {ParameterName} = {Value}", 
                    parameterName, intId);
            }
            else
            {
                // Fallback to TEXT for any other format
                parameterName = $"p_{entityName}Id";
                idParameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Text) 
                { 
                    Value = rowIdString 
                };
                _logger.LogInformation("Using TEXT parameter (fallback): {ParameterName} = {Value}", 
                    parameterName, rowIdString);
            }
            
            // Execute update function
            var sql = $"SELECT {updateProcedureName}(@{parameterName}, @p_ChangesJson, @p_UserId)";
            
            var parameters = new[]
            {
                idParameter,
                new NpgsqlParameter("p_ChangesJson", NpgsqlTypes.NpgsqlDbType.Text) { Value = changesJson },
                new NpgsqlParameter("p_UserId", NpgsqlTypes.NpgsqlDbType.Integer) { Value = userId }
            };

            // Create connection to target database using factory
            var connection = await _dbContextFactory.CreateConnectionAsync(databaseName);

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters);

            var jsonResult = await command.ExecuteScalarAsync();
            
            // Close connection
            await connection.DisposeAsync();
            
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

    public async Task<RowDeleteResponse> DeleteRowAsync(RowDeleteRequest request, string[] userRoles, int userId)
    {
        _logger.LogInformation("DeleteRowAsync called for procedure: {ProcedureName}, RowId: {RowId}", 
            request.ProcedureName, request.RowId);
        
        // Validate procedure access
        if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
        {
            throw new UnauthorizedAccessException($"Access denied to procedure: {request.ProcedureName}");
        }

        // Derive delete procedure name from grid procedure name
        // e.g., sp_Grid_Example_Employees -> sp_Grid_Delete_Employee
        // e.g., sp_Grid_Buses -> sp_Grid_Delete_Bus
        var deleteProcedureName = DeriveDeleteProcedureName(request.ProcedureName);
        
        _logger.LogInformation("Delete procedure name: {DeleteProcedureName}", deleteProcedureName);
        
        // Get delete procedure metadata for database routing
        var deleteProcedure = await _context.StoredProcedureRegistry
            .FirstOrDefaultAsync(p => p.ProcedureName == deleteProcedureName && p.IsActive);
        
        if (deleteProcedure == null)
        {
            _logger.LogWarning("Delete procedure not found or inactive: {DeleteProcedureName}", deleteProcedureName);
            return new RowDeleteResponse
            {
                Success = false,
                Message = "Delete not supported for this grid",
                ErrorCode = "DELETE_NOT_SUPPORTED"
            };
        }
        
        // Validate user has access to delete procedure
        if (!await ValidateProcedureAccessAsync(deleteProcedureName, userRoles))
        {
            _logger.LogWarning("Access denied to delete procedure: {DeleteProcedureName}", deleteProcedureName);
            return new RowDeleteResponse
            {
                Success = false,
                Message = "Access denied to delete this data",
                ErrorCode = "ACCESS_DENIED"
            };
        }
        
        var databaseName = deleteProcedure.DatabaseName;
        _logger.LogInformation("Executing delete on database: {DatabaseName}", databaseName ?? "DefaultConnection");

        try
        {
            // Determine parameter type and value based on the row ID
            string parameterName;
            NpgsqlParameter parameter;
            string rowIdString;
            
            // Convert RowId to string
            if (request.RowId is System.Text.Json.JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    rowIdString = jsonElement.GetInt32().ToString();
                }
                else
                {
                    rowIdString = jsonElement.GetString() ?? "";
                }
            }
            else
            {
                rowIdString = request.RowId?.ToString() ?? "";
            }
            
            _logger.LogInformation("RowId as string: {RowId}", rowIdString);
            
            // Extract entity name from delete procedure for parameter naming
            // sp_Grid_Delete_Employee -> Employee
            // sp_Grid_Delete_Bus -> Bus
            var entityName = deleteProcedureName.Replace("sp_Grid_Delete_", "");
            
            if (rowIdString.Contains("_"))
            {
                // Composite key format (e.g., "101_1") - use TEXT parameter
                parameterName = $"p_{entityName}Id";
                parameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Text) 
                { 
                    Value = rowIdString 
                };
                _logger.LogInformation("Using TEXT parameter for composite key: {ParameterName} = {Value}", 
                    parameterName, rowIdString);
            }
            else if (int.TryParse(rowIdString, out int intId))
            {
                // Simple integer ID - use INTEGER parameter
                parameterName = $"p_{entityName}Id";
                parameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Integer) 
                { 
                    Value = intId 
                };
                _logger.LogInformation("Using INTEGER parameter: {ParameterName} = {Value}", 
                    parameterName, intId);
            }
            else
            {
                // Fallback to TEXT for any other format
                parameterName = $"p_{entityName}Id";
                parameter = new NpgsqlParameter(parameterName, NpgsqlTypes.NpgsqlDbType.Text) 
                { 
                    Value = rowIdString 
                };
                _logger.LogInformation("Using TEXT parameter (fallback): {ParameterName} = {Value}", 
                    parameterName, rowIdString);
            }
            
            // Execute delete function
            var sql = $"SELECT {deleteProcedureName}(@{parameterName})";
            
            // Create connection to target database using factory
            var connection = await _dbContextFactory.CreateConnectionAsync(databaseName);

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(parameter);

            var jsonResult = await command.ExecuteScalarAsync();
            
            // Close connection
            await connection.DisposeAsync();
            
            if (jsonResult == null || jsonResult == DBNull.Value)
            {
                return new RowDeleteResponse
                {
                    Success = false,
                    Message = "No response from delete procedure"
                };
            }

            // Parse JSON response
            var jsonString = jsonResult.ToString()!;
            var response = JsonSerializer.Deserialize<RowDeleteResponse>(
                jsonString,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            return response ?? new RowDeleteResponse
            {
                Success = false,
                Message = "Failed to parse delete response"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing delete procedure: {ProcedureName}", deleteProcedureName);
            return new RowDeleteResponse
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
            // Skip CRUD helper procedures (Update, Delete) - only show grid data procedures
            if (proc.ProcedureName.Contains("_Update_") || proc.ProcedureName.Contains("_Delete_"))
            {
                continue;
            }
            
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

    private string DeriveUpdateProcedureName(string gridProcedureName)
    {
        // Derive update procedure name from grid procedure name using pattern matching
        // Pattern: sp_Grid_[Anything] -> sp_Grid_Update_[Entity]
        // Examples:
        //   sp_Grid_Example_Employees -> sp_Grid_Update_Employee
        //   sp_Grid_Buses -> sp_Grid_Update_Bus
        //   sp_Grid_Products -> sp_Grid_Update_Product
        
        // Remove "sp_Grid_" prefix
        var withoutPrefix = gridProcedureName.Replace("sp_Grid_", "");
        
        // Split by underscore to get parts
        var parts = withoutPrefix.Split('_');
        
        // Get the last part (entity name) and singularize if needed
        var entityName = parts[parts.Length - 1];
        
        // Simple singularization: remove trailing 's' if present
        if (entityName.EndsWith("es"))
        {
            // Buses -> Bus
            entityName = entityName.Substring(0, entityName.Length - 2);
        }
        else if (entityName.EndsWith("s") && !entityName.EndsWith("ss"))
        {
            // Employees -> Employee, Products -> Product
            entityName = entityName.Substring(0, entityName.Length - 1);
        }
        
        // Construct update procedure name
        return $"sp_Grid_Update_{entityName}";
    }

    private string DeriveDeleteProcedureName(string gridProcedureName)
    {
        // Derive delete procedure name from grid procedure name using pattern matching
        // Pattern: sp_Grid_[Anything] -> sp_Grid_Delete_[Entity]
        // Examples:
        //   sp_Grid_Example_Employees -> sp_Grid_Delete_Employee
        //   sp_Grid_Buses -> sp_Grid_Delete_Bus
        //   sp_Grid_Products -> sp_Grid_Delete_Product
        
        // Remove "sp_Grid_" prefix
        var withoutPrefix = gridProcedureName.Replace("sp_Grid_", "");
        
        // Split by underscore to get parts
        var parts = withoutPrefix.Split('_');
        
        // Get the last part (entity name) and singularize if needed
        var entityName = parts[parts.Length - 1];
        
        // Simple singularization: remove trailing 's' if present
        // For more complex cases, this could be enhanced
        if (entityName.EndsWith("es"))
        {
            // Buses -> Bus
            entityName = entityName.Substring(0, entityName.Length - 2);
        }
        else if (entityName.EndsWith("s") && !entityName.EndsWith("ss"))
        {
            // Employees -> Employee, Products -> Product
            // But not: Address -> Addres
            entityName = entityName.Substring(0, entityName.Length - 1);
        }
        
        // Construct delete procedure name
        return $"sp_Grid_Delete_{entityName}";
    }
}
