using WebAPI.DTOs;

namespace WebAPI.Services;

public interface IDynamicGridService
{
    /// <summary>
    /// Execute a dynamic grid stored procedure and return grid data
    /// </summary>
    Task<GridDataResponse> ExecuteGridProcedureAsync(GridDataRequest request, string[] userRoles);
    
    /// <summary>
    /// Update a row using the corresponding update stored procedure
    /// </summary>
    Task<RowUpdateResponse> UpdateRowAsync(RowUpdateRequest request, string[] userRoles, int userId);
    
    /// <summary>
    /// Delete a row using the corresponding delete stored procedure
    /// </summary>
    Task<RowDeleteResponse> DeleteRowAsync(RowDeleteRequest request, string[] userRoles, int userId);
    
    /// <summary>
    /// Get list of stored procedures the user has access to
    /// </summary>
    Task<List<StoredProcedureInfo>> GetAvailableProceduresAsync(string[] userRoles);
    
    /// <summary>
    /// Validate if user has access to a specific stored procedure
    /// </summary>
    Task<bool> ValidateProcedureAccessAsync(string procedureName, string[] userRoles);
    
    /// <summary>
    /// Get saved column state for a user and procedure
    /// </summary>
    Task<string?> GetColumnStateAsync(int userId, string procedureName);
    
    /// <summary>
    /// Save column state for a user and procedure
    /// </summary>
    Task SaveColumnStateAsync(int userId, string procedureName, string columnState);
    
    /// <summary>
    /// Create a new row using the corresponding insert stored procedure
    /// </summary>
    Task<RowCreateResponse> CreateRowAsync(RowCreateRequest request, string[] userRoles, int userId);
    
    /// <summary>
    /// Get dropdown values for cascading dropdowns with row context filtering
    /// </summary>
    Task<List<DropdownOption>> GetDropdownValuesAsync(DropdownValuesRequest request);
}
