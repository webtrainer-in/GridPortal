namespace WebAPI.DTOs;

public class SaveColumnStateRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public string ColumnState { get; set; } = string.Empty;  // JSON string
}
