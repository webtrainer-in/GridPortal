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
    public string? CellEditor { get; set; }  // 'text', 'number', 'date', 'dropdown'
    public string? CellEditorParams { get; set; }  // JSON string
    
    // Dropdown Configuration (for cascading dropdowns)
    public DropdownConfig? DropdownConfig { get; set; }
    
    // Link Configuration (for clickable columns)
    public LinkConfiguration? LinkConfig { get; set; }
    
    // Column Grouping
    public string? ColumnGroup { get; set; }
    public string? ColumnGroupShow { get; set; }  // 'open', 'closed', or null
    
    public bool? Pinned { get; set; }  // For actions column
    
    public Dictionary<string, object>? CustomProperties { get; set; }
}

public class DropdownConfig
{
    public string Type { get; set; } = "static"; // "static" or "dynamic"
    public List<DropdownOption>? StaticValues { get; set; }
    public string? MasterTable { get; set; }
    public string? ValueField { get; set; }
    public string? LabelField { get; set; }
    public string? FilterCondition { get; set; }
    public List<string>? DependsOn { get; set; }
}

public class DropdownOption
{
    public object? Value { get; set; }
    public string Label { get; set; } = string.Empty;
}

public class LinkConfiguration
{
    public bool Enabled { get; set; }
    public string RoutePath { get; set; } = string.Empty;
    public bool OpenInNewTab { get; set; } = false;
    public List<LinkParameter> Params { get; set; } = new();
}

public class LinkParameter
{
    public string Name { get; set; } = string.Empty;
    public List<string> Fields { get; set; } = new();
    public string? Separator { get; set; }
}
