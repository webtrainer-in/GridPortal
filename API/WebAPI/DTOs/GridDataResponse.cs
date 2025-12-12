namespace WebAPI.DTOs;

public class GridDataResponse
{
    public List<Dictionary<string, object>> Rows { get; set; } = new();
    public List<ColumnDefinition> Columns { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    
    // For Infinite Scrolling
    public int? LastRow { get; set; }  // Total rows available (null if unknown)
    
    public Dictionary<string, object>? Metadata { get; set; }
}
