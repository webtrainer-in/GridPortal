namespace WebAPI.DTOs;

public class RowDeleteResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? ErrorCode { get; set; }
    public int? RowsAffected { get; set; }
}
