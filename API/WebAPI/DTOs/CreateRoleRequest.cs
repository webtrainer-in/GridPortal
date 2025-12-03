using System.ComponentModel.DataAnnotations;

namespace WebAPI.DTOs;

public class CreateRoleRequest
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Description { get; set; }
}

public class UpdateRoleRequest
{
    [StringLength(50, MinimumLength = 2)]
    public string? Name { get; set; }

    [StringLength(200)]
    public string? Description { get; set; }

    public bool? IsActive { get; set; }
}

public class RoleResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public RoleInfo? Role { get; set; }
}
