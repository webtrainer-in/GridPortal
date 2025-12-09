using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAPI.DTOs;
using WebAPI.Services;

namespace WebAPI.Controllers;

// [Authorize]
[ApiController]
[Route("api/[controller]")]
public class DynamicGridController : ControllerBase
{
    private readonly IDynamicGridService _gridService;
    private readonly ILogger<DynamicGridController> _logger;

    public DynamicGridController(
        IDynamicGridService gridService,
        ILogger<DynamicGridController> logger)
    {
        _gridService = gridService;
        _logger = logger;
    }

    /// <summary>
    /// Execute a dynamic grid stored procedure
    /// </summary>
    [HttpPost("execute")]
    public async Task<IActionResult> ExecuteGridProcedure([FromBody] GridDataRequest request)
    {
        try
        {
            var userRoles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();

            var response = await _gridService.ExecuteGridProcedureAsync(request, userRoles);
            
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized grid access attempt: {ProcedureName}", request.ProcedureName);
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid grid request: {ProcedureName}", request.ProcedureName);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing grid procedure: {ProcedureName}", request.ProcedureName);
            return StatusCode(500, new { error = "An error occurred while loading grid data" });
        }
    }

    /// <summary>
    /// Update a row in the grid
    /// </summary>
    [HttpPost("update-row")]
    public async Task<IActionResult> UpdateRow([FromBody] RowUpdateRequest request)
    {
        try
        {
            var userRoles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();
            
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            var response = await _gridService.UpdateRowAsync(request, userRoles, userId);
            
            if (response.Success)
            {
                return Ok(response);
            }
            else
            {
                return BadRequest(response);
            }
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized row update attempt");
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating row");
            return StatusCode(500, new RowUpdateResponse 
            { 
                Success = false, 
                Message = "An error occurred while updating the row" 
            });
        }
    }

    /// <summary>
    /// Get list of available stored procedures for the current user
    /// </summary>
    [HttpGet("available-procedures")]
    public async Task<IActionResult> GetAvailableProcedures()
    {
        try
        {
            var userRoles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();

            var procedures = await _gridService.GetAvailableProceduresAsync(userRoles);
            
            return Ok(procedures);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available procedures");
            return StatusCode(500, new { error = "An error occurred while loading procedures" });
        }
    }

    /// <summary>
    /// Get saved column state for a procedure
    /// </summary>
    [HttpGet("column-state/{procedureName}")]
    public async Task<IActionResult> GetColumnState(string procedureName)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var state = await _gridService.GetColumnStateAsync(userId, procedureName);
            
            return Ok(new { columnState = state });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting column state");
            return StatusCode(500, new { error = "An error occurred while loading column state" });
        }
    }

    /// <summary>
    /// Save column state for a procedure
    /// </summary>
    [HttpPost("column-state")]
    public async Task<IActionResult> SaveColumnState([FromBody] SaveColumnStateRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            await _gridService.SaveColumnStateAsync(userId, request.ProcedureName, request.ColumnState);
            
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving column state");
            return StatusCode(500, new { error = "An error occurred while saving column state" });
        }
    }
}
