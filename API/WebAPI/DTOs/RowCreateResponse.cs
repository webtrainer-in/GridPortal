namespace WebAPI.DTOs;

/// <summary>
/// Response DTO for row creation operations
/// </summary>
public class RowCreateResponse
{
    /// <summary>
    /// Indicates whether the row creation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Message describing the result (error message if failed)
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// The newly created row data including the generated ID
    /// </summary>
    public Dictionary<string, object?>? CreatedRow { get; set; }

    /// <summary>
    /// Error code for programmatic error handling
    /// </summary>
    public string? ErrorCode { get; set; }
}
