using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI.Data;
using WebAPI.DTOs;
using WebAPI.Models;

namespace WebAPI.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class RoleManagementController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RoleManagementController> _logger;

    public RoleManagementController(ApplicationDbContext context, ILogger<RoleManagementController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all available roles
    /// </summary>
    [HttpGet("roles")]
    [ProducesResponseType(typeof(RoleListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RoleListResponse>> GetAllRoles()
    {
        var roles = await _context.Roles
            .Where(r => r.IsActive)
            .Select(r => new RoleInfo
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description
            })
            .ToListAsync();

        return Ok(new RoleListResponse { Roles = roles });
    }

    /// <summary>
    /// Create a new role
    /// </summary>
    [HttpPost("roles")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleResponse>> CreateRole([FromBody] CreateRoleRequest request)
    {
        // Check if role name already exists
        var existingRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower());

        if (existingRole != null)
        {
            return BadRequest(new RoleResponse
            {
                Success = false,
                Message = $"Role '{request.Name}' already exists"
            });
        }

        var role = new Role
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleName} created by {AdminUsername}", role.Name, User.Identity?.Name);

        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, new RoleResponse
        {
            Success = true,
            Message = "Role created successfully",
            Role = new RoleInfo
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description
            }
        });
    }

    /// <summary>
    /// Get a specific role by ID
    /// </summary>
    [HttpGet("roles/{id}")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> GetRoleById(int id)
    {
        var role = await _context.Roles.FindAsync(id);

        if (role == null)
        {
            return NotFound(new RoleResponse
            {
                Success = false,
                Message = "Role not found"
            });
        }

        return Ok(new RoleResponse
        {
            Success = true,
            Message = "Role retrieved successfully",
            Role = new RoleInfo
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description
            }
        });
    }

    /// <summary>
    /// Update an existing role
    /// </summary>
    [HttpPut("roles/{id}")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> UpdateRole(int id, [FromBody] UpdateRoleRequest request)
    {
        var role = await _context.Roles.FindAsync(id);

        if (role == null)
        {
            return NotFound(new RoleResponse
            {
                Success = false,
                Message = "Role not found"
            });
        }

        // Check if new name conflicts with existing role
        if (!string.IsNullOrWhiteSpace(request.Name) && request.Name != role.Name)
        {
            var existingRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name.ToLower() == request.Name.ToLower() && r.Id != id);

            if (existingRole != null)
            {
                return BadRequest(new RoleResponse
                {
                    Success = false,
                    Message = $"Role name '{request.Name}' is already in use"
                });
            }

            role.Name = request.Name;
        }

        if (request.Description != null)
            role.Description = request.Description;

        if (request.IsActive.HasValue)
            role.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleName} updated by {AdminUsername}", role.Name, User.Identity?.Name);

        return Ok(new RoleResponse
        {
            Success = true,
            Message = "Role updated successfully",
            Role = new RoleInfo
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description
            }
        });
    }

    /// <summary>
    /// Delete a role (soft delete by setting IsActive to false)
    /// </summary>
    [HttpDelete("roles/{id}")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> DeleteRole(int id)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
        {
            return NotFound(new RoleResponse
            {
                Success = false,
                Message = "Role not found"
            });
        }

        // Check if role is assigned to any users
        if (role.UserRoles.Any())
        {
            return BadRequest(new RoleResponse
            {
                Success = false,
                Message = $"Cannot delete role '{role.Name}' as it is assigned to {role.UserRoles.Count} user(s)"
            });
        }

        // Soft delete
        role.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleName} deleted by {AdminUsername}", role.Name, User.Identity?.Name);

        return Ok(new RoleResponse
        {
            Success = true,
            Message = "Role deleted successfully",
            Role = new RoleInfo
            {
                Id = role.Id,
                Name = role.Name,
                Description = role.Description
            }
        });
    }

    /// <summary>
    /// Get roles for a specific user
    /// </summary>
    [HttpGet("users/{userId}/roles")]
    [ProducesResponseType(typeof(UserRoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRoleResponse>> GetUserRoles(int userId)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = "User not found"
            });
        }

        return Ok(new UserRoleResponse
        {
            Success = true,
            Message = "User roles retrieved successfully",
            User = new UserRoleInfo
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Roles = user.UserRoles
                    .Where(ur => ur.Role != null && ur.Role.IsActive)
                    .Select(ur => new RoleInfo
                    {
                        Id = ur.Role.Id,
                        Name = ur.Role.Name,
                        Description = ur.Role.Description
                    })
                    .ToList()
            }
        });
    }

    /// <summary>
    /// Assign a role to a user
    /// </summary>
    [HttpPost("assign")]
    [ProducesResponseType(typeof(UserRoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRoleResponse>> AssignRole([FromBody] AssignRoleRequest request)
    {
        // Check if user exists
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId);

        if (user == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = "User not found"
            });
        }

        // Check if role exists
        var role = await _context.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = "Role not found"
            });
        }

        // Check if user already has this role
        var existingUserRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId);

        if (existingUserRole != null)
        {
            return BadRequest(new UserRoleResponse
            {
                Success = false,
                Message = $"User already has the '{role.Name}' role"
            });
        }

        // Assign the role
        var userRole = new UserRole
        {
            UserId = request.UserId,
            RoleId = request.RoleId,
            AssignedAt = DateTime.UtcNow
        };

        _context.UserRoles.Add(userRole);
        await _context.SaveChangesAsync();

        // Reload user with updated roles
        user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstAsync(u => u.Id == request.UserId);

        _logger.LogInformation("Role {RoleName} assigned to user {Username} by {AdminUsername}",
            role.Name, user.Username, User.Identity?.Name);

        return Ok(new UserRoleResponse
        {
            Success = true,
            Message = $"Role '{role.Name}' assigned successfully",
            User = new UserRoleInfo
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Roles = user.UserRoles
                    .Where(ur => ur.Role != null && ur.Role.IsActive)
                    .Select(ur => new RoleInfo
                    {
                        Id = ur.Role.Id,
                        Name = ur.Role.Name,
                        Description = ur.Role.Description
                    })
                    .ToList()
            }
        });
    }

    /// <summary>
    /// Remove a role from a user
    /// </summary>
    [HttpPost("remove")]
    [ProducesResponseType(typeof(UserRoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRoleResponse>> RemoveRole([FromBody] RemoveRoleRequest request)
    {
        // Check if user exists
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId);

        if (user == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = "User not found"
            });
        }

        // Check if role exists
        var role = await _context.Roles.FindAsync(request.RoleId);
        if (role == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = "Role not found"
            });
        }

        // Find the user role assignment
        var userRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId);

        if (userRole == null)
        {
            return NotFound(new UserRoleResponse
            {
                Success = false,
                Message = $"User does not have the '{role.Name}' role"
            });
        }

        // Remove the role
        _context.UserRoles.Remove(userRole);
        await _context.SaveChangesAsync();

        // Reload user with updated roles
        user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstAsync(u => u.Id == request.UserId);

        _logger.LogInformation("Role {RoleName} removed from user {Username} by {AdminUsername}",
            role.Name, user.Username, User.Identity?.Name);

        return Ok(new UserRoleResponse
        {
            Success = true,
            Message = $"Role '{role.Name}' removed successfully",
            User = new UserRoleInfo
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Roles = user.UserRoles
                    .Where(ur => ur.Role != null && ur.Role.IsActive)
                    .Select(ur => new RoleInfo
                    {
                        Id = ur.Role.Id,
                        Name = ur.Role.Name,
                        Description = ur.Role.Description
                    })
                    .ToList()
            }
        });
    }

    /// <summary>
    /// Get all users with their roles
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(List<UserRoleInfo>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<UserRoleInfo>>> GetAllUsersWithRoles()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Where(u => u.IsActive)
            .Select(u => new UserRoleInfo
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Roles = u.UserRoles
                    .Where(ur => ur.Role != null && ur.Role.IsActive)
                    .Select(ur => new RoleInfo
                    {
                        Id = ur.Role.Id,
                        Name = ur.Role.Name,
                        Description = ur.Role.Description
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(users);
    }
}
