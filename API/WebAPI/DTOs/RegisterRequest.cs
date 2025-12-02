using System.ComponentModel.DataAnnotations;

namespace WebAPI.DTOs;

public class RegisterRequest
{
    [Required]
    [MinLength(3)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
