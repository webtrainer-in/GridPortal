# Grid Drill-Down Administrator Guide

## Overview
This guide explains how to configure and manage the drill-down feature in Grid Portal. The system supports two operational modes that can be switched via configuration.

## Configuration

### Location
All drill-down settings are configured in `appsettings.json`:

```json
{
  "DrillDownSettings": {
    "EnableUnlimitedDrillDown": true,
    "DefaultMaxDepth": 15
  }
}
```

### Settings Explained

#### `EnableUnlimitedDrillDown` (boolean)
- **`true`**: Enables unlimited drill-down mode
  - No depth limit
  - Breadcrumbs hidden
  - Optimized for deep navigation
  - Minimal URL state

- **`false`**: Enables limited drill-down mode
  - Enforces depth limit
  - Breadcrumbs visible
  - Full navigation history
  - Complete URL state

#### `DefaultMaxDepth` (integer)
- **Used when**: `EnableUnlimitedDrillDown` is `false`
- **Purpose**: Sets the maximum number of drill-down levels allowed
- **Recommended**: 10-20 levels
- **Example**: `15` allows drilling down 15 times before hitting the limit

### Applying Configuration Changes

1. Edit `appsettings.json` or `appsettings.Development.json`
2. **Restart the backend application**
3. Frontend automatically adapts to the new settings

**Important**: Configuration changes require a backend restart to take effect.

---

## Mode Selection Guide

### Choose Unlimited Mode When:
- ✅ Users need to explore complex relationships without limits
- ✅ The data model has deep hierarchical structures
- ✅ Performance and memory optimization are priorities
- ✅ Users are comfortable with minimal navigation UI

### Choose Limited Mode When:
- ✅ Users need to see their complete navigation path
- ✅ You want to prevent users from getting lost in deep navigation
- ✅ Page refresh should preserve the full drill-down state
- ✅ Users prefer visual breadcrumb navigation

---

## Technical Implementation

### Backend Behavior

When a grid is loaded, the backend applies the global drill-down settings:

**Unlimited Mode** (`EnableUnlimitedDrillDown: true`):
```csharp
column.LinkConfig.DrillDown.MaxDepth = -1; // All columns
```

**Limited Mode** (`EnableUnlimitedDrillDown: false`):
```csharp
column.LinkConfig.DrillDown.MaxDepth = DefaultMaxDepth; // All columns
```

### Frontend Behavior

The frontend detects the `maxDepth` value and automatically:

**When `maxDepth === -1`** (Unlimited):
- Hides breadcrumbs
- Uses sliding window state (2 levels in memory)
- Stores only current level in URL
- Skips depth validation

**When `maxDepth > 0`** (Limited):
- Shows breadcrumbs
- Maintains full drill-down history
- Stores complete path in URL
- Enforces depth limit

---

## Database Configuration

### Column-Level Configuration (Deprecated)

**Note**: As of the latest version, column-level `maxDepth` and `allowMultipleLevels` are **no longer used**. All drill-down depth control is now global via `appsettings.json`.

### Drill-Down Link Configuration

Columns are configured for drill-down in the `ColumnMetadata` table:

```json
{
  "enabled": true,
  "drillDown": {
    "enabled": true,
    "targetProcedure": "sp_Grid_Bus_Transformers",
    "filterParams": [
      {
        "targetColumn": "BusNumber",
        "sourceFields": ["ibus"]
      }
    ],
    "breadcrumbLabel": "{name} - Transformers"
  }
}
```

**Properties**:
- `targetProcedure`: The stored procedure to call when drilling down
- `filterParams`: How to filter the target grid based on the clicked row
- `breadcrumbLabel`: Label to show in breadcrumbs (supports placeholders like `{name}`)

### Adding New Drill-Down Links

1. Create a SQL script in `Database/Scripts/`
2. Insert into `ColumnMetadata` with the drill-down configuration
3. Run the script against your database
4. The global `DrillDownSettings` will automatically apply to the new column

**Example**:
```sql
INSERT INTO "ColumnMetadata" (
    "ProcedureName",
    "ColumnName",
    "LinkConfig"
)
VALUES (
    'sp_Grid_Buses',
    'transformerCount',
    '{
      "enabled": true,
      "drillDown": {
        "enabled": true,
        "targetProcedure": "sp_Grid_Bus_Transformers",
        "filterParams": [
          {
            "targetColumn": "BusNumber",
            "sourceFields": ["ibus"]
          }
        ],
        "breadcrumbLabel": "{name} - Transformers"
      }
    }'::JSONB
);
```

---

## Monitoring and Troubleshooting

### Backend Logs

Enable debug logging to see drill-down configuration being applied:

```json
{
  "Logging": {
    "LogLevel": {
      "WebAPI.Services.DynamicGridService": "Debug"
    }
  }
}
```

**Log messages to look for**:
- `Applied unlimited drill-down to column {Column} (maxDepth = -1)`
- `Applied default maxDepth ({MaxDepth}) to column {Column}`

### Frontend Console Logs

The frontend logs drill-down operations in the browser console:

**Unlimited Mode**:
```
🔄 Stateless drill-down: Using sliding window (2 levels max)
🔗 Stateless URL: Only current level stored
```

**Limited Mode**:
```
📊 Drill-down state changed: {levels: Array(5), currentLevel: 4, isStatelessMode: false}
🔄 Restored stateful drill-down from URL
```

### Common Issues

#### Users report "Maximum depth reached" too early
**Solution**: Increase `DefaultMaxDepth` in `appsettings.json` and restart backend

#### Breadcrumbs not showing
**Check**: Is `EnableUnlimitedDrillDown` set to `true`? If yes, this is expected behavior

#### Drill-down not working at all
**Check**:
1. Is the column configured in `ColumnMetadata`?
2. Does the target stored procedure exist?
3. Are the filter parameters correct?
4. Check backend logs for errors

#### Page refresh loses drill-down state
**Check**: Is `EnableUnlimitedDrillDown` set to `true`? If yes, this is expected behavior in unlimited mode

---

## Performance Considerations

### Unlimited Mode
- **Memory**: Constant (sliding window of 2 levels)
- **URL Size**: Minimal (~100-200 characters)
- **Best for**: Deep navigation, many drill-down operations

### Limited Mode
- **Memory**: Grows with drill-down depth
- **URL Size**: Grows with drill-down depth (~100 chars per level)
- **Best for**: Moderate depth (≤20 levels), users who need full history

---

## Migration Guide

### Removing Column-Level Configuration

If you have existing column-level `maxDepth` or `allowMultipleLevels` configuration in your database, run the cleanup script:

```bash
psql -U postgres -d GridPortalDb_Dev -f "Database/Scripts/10_Remove_Column_Level_DrillDown_Config.sql"
```

This removes deprecated column-level settings, ensuring all depth control comes from `appsettings.json`.

---

## API Endpoint

### Get Current Drill-Down Settings

**Endpoint**: `GET /api/Configuration/drill-down-settings`

**Response**:
```json
{
  "enableUnlimitedDrillDown": true,
  "defaultMaxDepth": 15
}
```

**Use case**: Frontend can query this endpoint to display current settings in an admin panel (if implemented).

---

## Recommendations

### For Production
- **Start with Limited Mode** (`EnableUnlimitedDrillDown: false`)
- Set `DefaultMaxDepth` to 15-20
- Monitor user feedback
- Switch to Unlimited Mode if users frequently hit the depth limit

### For Development/Testing
- Use **Unlimited Mode** for flexibility
- Test both modes to ensure compatibility
- Verify breadcrumb behavior in Limited Mode

### For Power Users
- **Unlimited Mode** provides maximum flexibility
- Train users on back button navigation
- Provide keyboard shortcut documentation

---

## Security Considerations

- Drill-down respects the same authentication and authorization as the base grids
- No additional permissions needed for drill-down functionality
- Filter parameters are validated by the stored procedures
- SQL injection protection is handled by parameterized queries

---

## Future Enhancements

Potential features for future versions:
- Per-user drill-down mode preferences
- Per-grid drill-down mode overrides
- Drill-down analytics (track most common paths)
- Drill-down path suggestions based on usage patterns

---

## Support

For issues or questions:
1. Check backend logs for configuration errors
2. Check browser console for frontend errors
3. Verify database `ColumnMetadata` configuration
4. Review this documentation
5. Contact development team if issues persist
