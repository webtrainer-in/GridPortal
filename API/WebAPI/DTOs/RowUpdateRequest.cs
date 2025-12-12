namespace WebAPI.DTOs;

public class RowUpdateRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public object RowId { get; set; } = null!;  // Primary key value
    public Dictionary<string, object> Changes { get; set; } = new();  // Field -> New Value
}
