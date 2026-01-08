namespace WebAPI.DTOs;

public class GridDataRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    
    // Traditional Pagination
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 15;
    
    // Infinite Scrolling (Server-Side Row Model)
    public int? StartRow { get; set; }
    public int? EndRow { get; set; }
    
    // Sorting & Filtering
    public string? SortColumn { get; set; }
    public string? SortDirection { get; set; } = "ASC";
    public string? FilterJson { get; set; }
    public string? DrillDownJson { get; set; }
    public string? SearchTerm { get; set; }
}
