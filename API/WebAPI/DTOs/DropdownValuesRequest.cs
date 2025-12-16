using System.Collections.Generic;

namespace WebAPI.DTOs;

/// <summary>
/// Request to get dropdown values with row context filtering
/// </summary>
public class DropdownValuesRequest
{
    public string ProcedureName { get; set; } = string.Empty; // For database routing
    public string MasterTable { get; set; } = string.Empty;
    public string ValueField { get; set; } = string.Empty;
    public string LabelField { get; set; } = string.Empty;
    public string? FilterCondition { get; set; }
    public Dictionary<string, object>? RowContext { get; set; }
}
