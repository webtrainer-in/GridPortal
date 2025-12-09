using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public class Employee
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    [Required]
    public int DepartmentId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Salary { get; set; }

    public DateTime JoinDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "Active";  // Active, Inactive, On Leave

    public bool IsActive { get; set; } = true;

    [MaxLength(100)]
    public string? Location { get; set; }

    [Column(TypeName = "decimal(3,2)")]
    public decimal? PerformanceRating { get; set; }  // 0.00 to 5.00

    public int? YearsExperience { get; set; }

    [MaxLength(100)]
    public string? ReportingManager { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    // Navigation property
    [ForeignKey(nameof(DepartmentId))]
    public Department? Department { get; set; }
}
