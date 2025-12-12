namespace WebAPI.DTOs;

public class ColumnDefinition
{
    public string Field { get; set; } = string.Empty;
    public string HeaderName { get; set; } = string.Empty;
    public string Type { get; set; } = "string";  // string, number, date, boolean
    public int? Width { get; set; }
    public bool Sortable { get; set; } = true;
    public bool Filter { get; set; } = true;
    
    // Inline Editing Support
    public bool Editable { get; set; } = false;
    public string? CellEditor { get; set; }  // 'agTextCellEditor', 'agSelectCellEditor', etc.
    public string? CellEditorParams { get; set; }  // JSON string
    
    // Column Grouping
    public string? ColumnGroup { get; set; }
    public string? ColumnGroupShow { get; set; }  // 'open', 'closed', or null
    
    public bool? Pinned { get; set; }  // For actions column
    
    public Dictionary<string, object>? CustomProperties { get; set; }
}
