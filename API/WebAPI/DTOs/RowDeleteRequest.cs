namespace WebAPI.DTOs;

public class RowDeleteRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public object RowId { get; set; } = null!;
}
