namespace WebAPI.Configuration
{
    /// <summary>
    /// Configuration settings for drill-down behavior across the application
    /// </summary>
    public class DrillDownSettings
    {
        /// <summary>
        /// When true, all drill-downs are unlimited (ignores column-level maxDepth).
        /// When false, uses column-level maxDepth or DefaultMaxDepth.
        /// </summary>
        public bool EnableUnlimitedDrillDown { get; set; } = false;

        /// <summary>
        /// Default maximum drill-down depth when EnableUnlimitedDrillDown is false.
        /// Used as fallback if column doesn't specify maxDepth.
        /// </summary>
        public int DefaultMaxDepth { get; set; } = 5;
    }
}
