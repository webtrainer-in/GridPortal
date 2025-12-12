using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public class StoredProcedureRegistry
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProcedureName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int? ClientId { get; set; }  // For multi-tenant scenarios

    [MaxLength(50)]
    public string? Category { get; set; }  // e.g., "HR", "Finance", "Sales"

    public bool IsActive { get; set; } = true;

    public bool RequiresAuth { get; set; } = true;

    [Required]
    public string AllowedRoles { get; set; } = "[]";  // JSON array: ["Admin", "Manager"]

    public int? CacheDurationSeconds { get; set; }  // Optional caching

    public int DefaultPageSize { get; set; } = 15;

    public int MaxPageSize { get; set; } = 1000;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? CreatedBy { get; set; }

    public int? UpdatedBy { get; set; }
}
