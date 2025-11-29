namespace WebAPI.DTOs;

public class AssignRoleRequest
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
}

public class RemoveRoleRequest
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
}

public class UserRoleResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserRoleInfo? User { get; set; }
}

public class UserRoleInfo
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public List<RoleInfo> Roles { get; set; } = new();
}

public class RoleInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class RoleListResponse
{
    public List<RoleInfo> Roles { get; set; } = new();
}
