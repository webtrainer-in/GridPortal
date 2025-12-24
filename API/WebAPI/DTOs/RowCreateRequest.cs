namespace WebAPI.DTOs;

/// <summary>
/// Request DTO for creating a new row in a dynamic grid
/// </summary>
public class RowCreateRequest
{
    /// <summary>
    /// Name of the stored procedure that defines the grid
    /// </summary>
    public string ProcedureName { get; set; } = string.Empty;

    /// <summary>
    /// Dictionary of field names and their values for the new row
    /// Key: Field name (column name)
    /// Value: Field value (can be any type)
    /// </summary>
    public Dictionary<string, object?> FieldValues { get; set; } = new();
}
