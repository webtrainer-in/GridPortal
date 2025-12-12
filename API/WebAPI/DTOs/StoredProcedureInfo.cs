namespace WebAPI.DTOs;

public class StoredProcedureInfo
{
    public int Id { get; set; }
    public string ProcedureName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; }
    public bool RequiresAuth { get; set; }
    public List<string> AllowedRoles { get; set; } = new();
    public int DefaultPageSize { get; set; }
    public int MaxPageSize { get; set; }
}
