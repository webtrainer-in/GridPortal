using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebAPI.Configuration;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConfigurationController : ControllerBase
    {
        private readonly DrillDownSettings _drillDownSettings;

        public ConfigurationController(IOptions<DrillDownSettings> drillDownSettings)
        {
            _drillDownSettings = drillDownSettings.Value;
        }

        /// <summary>
        /// Get drill-down configuration settings
        /// </summary>
        /// <returns>Drill-down settings</returns>
        [HttpGet("drill-down-settings")]
        public ActionResult<DrillDownSettings> GetDrillDownSettings()
        {
            return Ok(_drillDownSettings);
        }
    }
}
