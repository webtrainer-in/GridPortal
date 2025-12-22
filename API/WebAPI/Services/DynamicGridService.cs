using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Text.Json;
using WebAPI.Configuration;
using WebAPI.Data;
using WebAPI.DTOs;
using WebAPI.Models;

namespace WebAPI.Services;

public class DynamicGridService : IDynamicGridService
{
    private readonly ApplicationDbContext _context;
    private readonly IDbContextFactory _dbContextFactory;
    private readonly ILogger<DynamicGridService> _logger;
    private readonly DrillDownSettings _drillDownSettings;

    public DynamicGridService(
        ApplicationDbContext context,
        IDbContextFactory dbContextFactory,
        ILogger<DynamicGridService> logger,
        IOptions<DrillDownSettings> drillDownSettings)
    {
        _context = context;
        _dbContextFactory = dbContextFactory;
        _logger = logger;
        _drillDownSettings = drillDownSettings.Value;
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

            // Apply global drill-down settings to column definitions
            if (response.Columns != null && response.Columns.Count > 0)
            {
                ApplyGlobalDrillDownSettings(response.Columns);
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

    public async Task<List<DropdownOption>> GetDropdownValuesAsync(DropdownValuesRequest request)
    {
        // Get the database name from the procedure (for per-database master tables)
        string? databaseName = null;
        if (!string.IsNullOrEmpty(request.ProcedureName))
        {
            var procedure = await _context.StoredProcedureRegistry
                .FirstOrDefaultAsync(p => p.ProcedureName == request.ProcedureName && p.IsActive);
            
            if (procedure != null)
            {
                databaseName = procedure.DatabaseName;
                _logger.LogInformation("Querying master table {Table} from database: {Database}", 
                    request.MasterTable, databaseName ?? "DefaultConnection");
            }
        }

        // Dynamic whitelist: Get allowed tables from ColumnMetadata
        // This automatically whitelists any table configured in ColumnMetadata
        var allowedTables = new HashSet<string>();
        using var whitelistConnection = await _dbContextFactory.CreateConnectionAsync(databaseName);
        
        try
        {
            using var cmd = whitelistConnection.CreateCommand();
            cmd.CommandText = @"
                SELECT DISTINCT ""MasterTable"" 
                FROM ""ColumnMetadata"" 
                WHERE ""MasterTable"" IS NOT NULL 
                  AND ""IsActive"" = true 
                  AND ""CellEditor"" = 'dropdown'";
            
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var tableName = reader.GetString(0);
                if (!string.IsNullOrEmpty(tableName))
                {
                    allowedTables.Add(tableName);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load whitelist from ColumnMetadata, using fallback");
            // Fallback to basic whitelist if ColumnMetadata doesn't exist
            allowedTables = new HashSet<string> { "Groups", "Departments", "Zone" };
        }
        
        if (!allowedTables.Contains(request.MasterTable))
        {
            _logger.LogWarning("Table {Table} not in whitelist. Allowed: {Allowed}", 
                request.MasterTable, string.Join(", ", allowedTables));
            throw new ArgumentException($"Invalid master table: {request.MasterTable}");
        }

        try
        {
            // Build SQL query with parameterized placeholders
            var sql = BuildDropdownQuery(request, out var parameters);
            
            _logger.LogInformation("Executing dropdown query for table: {Table}, SQL: {SQL}", 
                request.MasterTable, sql);

            // Execute query using grid's database (where master tables live)
            var connection = await _dbContextFactory.CreateConnectionAsync(databaseName);

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            
            // Add parameters
            foreach (var param in parameters)
            {
                command.Parameters.Add(param);
            }

            var options = new List<DropdownOption>();
            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                options.Add(new DropdownOption
                {
                    Value = reader["value"] != DBNull.Value ? reader["value"] : null,
                    Label = reader["label"]?.ToString() ?? string.Empty
                });
            }

            await connection.DisposeAsync();

            _logger.LogInformation("Loaded {Count} dropdown options from {Table}", 
                options.Count, request.MasterTable);

            return options;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading dropdown values from table: {Table}", request.MasterTable);
            throw;
        }
    }

    private string BuildDropdownQuery(DropdownValuesRequest request, out List<NpgsqlParameter> parameters)
    {
        parameters = new List<NpgsqlParameter>();

        // Sanitize table and field names (already validated)
        var table = SanitizeIdentifier(request.MasterTable);
        var valueField = SanitizeIdentifier(request.ValueField);
        var labelField = SanitizeIdentifier(request.LabelField);

        // Build base query
        var sql = $@"
            SELECT DISTINCT 
                ""{valueField}"" as value,
                ""{labelField}"" as label
            FROM ""{table}""";

        // Add WHERE clause if filter condition exists
        if (!string.IsNullOrEmpty(request.FilterCondition) && request.RowContext != null)
        {
            var whereClause = ReplaceFilterPlaceholders(request.FilterCondition, request.RowContext, parameters);
            sql += $" WHERE {whereClause}";
        }

        sql += $@" ORDER BY ""{labelField}""";

        return sql;
    }

    private string ReplaceFilterPlaceholders(
        string filterCondition, 
        Dictionary<string, object> rowContext, 
        List<NpgsqlParameter> parameters)
    {
        var result = filterCondition;
        var paramIndex = 0;

        foreach (var kvp in rowContext)
        {
            var placeholder = $"@param_{kvp.Key}";
            
            if (result.Contains(placeholder))
            {
                // Create parameter with unique name
                var paramName = $"p{paramIndex}";
                
                // Extract actual value from JSON if needed
                object paramValue = kvp.Value;
                
                if (paramValue != null)
                {
                    // Handle System.Text.Json.JsonElement
                    if (paramValue.GetType().Name == "JsonElement")
                    {
                        var jsonElement = (System.Text.Json.JsonElement)paramValue;
                        paramValue = jsonElement.ValueKind switch
                        {
                            System.Text.Json.JsonValueKind.Number => jsonElement.GetInt32(),
                            System.Text.Json.JsonValueKind.String => jsonElement.GetString(),
                            System.Text.Json.JsonValueKind.True => true,
                            System.Text.Json.JsonValueKind.False => false,
                            System.Text.Json.JsonValueKind.Null => DBNull.Value,
                            _ => jsonElement.ToString()
                        };
                    }
                }
                
                parameters.Add(new NpgsqlParameter(paramName, paramValue ?? DBNull.Value));
                
                // Replace placeholder with parameter reference
                result = result.Replace(placeholder, $"@{paramName}");
                paramIndex++;
            }
        }

        return result;
    }

    private bool IsValidFieldName(string fieldName)
    {
        // Only allow alphanumeric characters and underscores
        return System.Text.RegularExpressions.Regex.IsMatch(fieldName, @"^[a-zA-Z0-9_]+$");
    }

    private string SanitizeIdentifier(string identifier)
    {
        // Remove any quotes and validate
        identifier = identifier.Replace("\"", "").Replace("'", "");
        
        if (!IsValidFieldName(identifier))
        {
            throw new ArgumentException($"Invalid identifier: {identifier}");
        }
        
        return identifier;
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

    /// <summary>
    /// Apply global drill-down settings to column definitions
    /// </summary>
    private void ApplyGlobalDrillDownSettings(List<ColumnDefinition> columns)
    {
        foreach (var column in columns)
        {
            // Only process columns that have drill-down configuration
            if (column.LinkConfig?.DrillDown != null)
            {
                if (_drillDownSettings.EnableUnlimitedDrillDown)
                {
                    // Override maxDepth to -1 for unlimited drill-down
                    column.LinkConfig.DrillDown.MaxDepth = -1;
                    _logger.LogDebug(
                        "Applied unlimited drill-down to column {Column} (maxDepth = -1)", 
                        column.Field);
                }
                else
                {
                    // When unlimited is disabled, always use DefaultMaxDepth
                    // This overrides any column-level maxDepth configuration
                    column.LinkConfig.DrillDown.MaxDepth = _drillDownSettings.DefaultMaxDepth;
                    _logger.LogDebug(
                        "Applied default maxDepth ({MaxDepth}) to column {Column}", 
                        _drillDownSettings.DefaultMaxDepth,
                        column.Field);
                }
            }
        }
    }
}
