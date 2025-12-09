namespace WebAPI.DTOs;

public class RowUpdateResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? UpdatedRow { get; set; }
    public string? ErrorCode { get; set; }
}
