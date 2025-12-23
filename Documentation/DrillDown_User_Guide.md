# Grid Drill-Down User Guide

## Overview
The Grid Portal supports drill-down navigation, allowing you to click on linked values in the grid to view related data in detail. The system supports two modes of operation that can be configured by your administrator.

## What is Drill-Down?

Drill-down allows you to navigate through related data by clicking on specific values in the grid. For example:
- Click on a **Transformer Count** in the Bus grid to see all transformers connected to that bus
- Click on a **Bus Number** in the Transformer grid to see details of that specific bus
- Continue drilling through multiple levels of related data

## Navigation Controls

### Breadcrumb Trail (Limited Mode Only)
When drill-down depth limits are enabled, you'll see a breadcrumb trail at the top of the grid showing your navigation path:

```
Buses > Bus 101 - Transformers > Bus 102
```

- **Click any breadcrumb** to jump back to that level
- **Click the back arrow (←)** to go back one level
- **Press Backspace** on your keyboard to go back one level

### Browser Navigation
- **Browser back button** works as expected
- **URL is shareable** - copy and paste to share your current view with others

## Drill-Down Modes

Your administrator can configure the system to operate in one of two modes:

---

## Mode 1: Unlimited Drill-Down

### What It Does
- **No depth limit** - drill down as many times as you need
- **Streamlined interface** - no breadcrumb trail to keep the view clean
- **Optimized performance** - designed for deep navigation

### When to Use
- Exploring complex relationships in the power system
- Following connections through multiple levels
- When you need to trace paths without artificial limits

### How It Works
1. Click on any linked value (shown in blue/underlined)
2. The grid updates to show related data
3. Continue clicking to drill deeper
4. Use the **back arrow (←)** or **Backspace** to go back one level
5. Use the **browser back button** to navigate your history

### Example Workflow
```
Buses Grid
  ↓ (click transformer count for Bus 101)
Transformers connected to Bus 101
  ↓ (click bus number 102)
Bus 102 Details
  ↓ (click transformer count)
Transformers connected to Bus 102
  ↓ (continue as needed...)
```

### Limitations
- **No breadcrumb trail** - you can only see your current level
- **Page refresh loses history** - refreshing the browser returns you to the current level only
- **One step back** - you can only go back one level at a time (no jumping to earlier levels)

### Tips
- Use the browser's back button if you need to retrace multiple steps
- Bookmark important views for quick access
- The URL always shows your current filter, making it easy to share specific views

---

## Mode 2: Limited Drill-Down

### What It Does
- **Depth limit enforced** - prevents drilling beyond a configured number of levels (typically 15)
- **Full breadcrumb trail** - see your complete navigation path
- **Complete history** - page refresh restores your full drill-down path

### When to Use
- When you need to see your complete navigation path
- When you want to jump back to any previous level quickly
- When page refresh should preserve your full navigation history

### How It Works
1. Click on any linked value (shown in blue/underlined)
2. The grid updates and the breadcrumb trail shows your path
3. Continue drilling until you reach the depth limit
4. Use breadcrumbs to jump to any previous level
5. Use the **back arrow (←)** or **Backspace** to go back one level

### Example Workflow
```
Breadcrumb Trail:
Buses > Bus 101 - Transformers > Bus 102 > Bus 102 - Transformers

Current View: Transformers connected to Bus 102
```

### Features
- **Full breadcrumb navigation** - click any level to jump back
- **Depth limit protection** - prevents getting lost in deep navigation
- **Complete URL history** - full path preserved in URL
- **Page refresh safe** - refreshing restores your complete drill-down state

### Depth Limit Behavior
When you reach the maximum depth:
- Links become non-clickable
- A warning message appears: "Maximum drill-down depth reached"
- You must go back before drilling in a different direction

### Tips
- Watch the breadcrumb trail to see where you are
- Click breadcrumbs to quickly jump back to earlier levels
- The URL contains your complete path - bookmark complex navigation sequences
- If you hit the depth limit, go back a few levels before exploring a different path

---

## Comparison Table

| Feature | Unlimited Mode | Limited Mode |
|---------|---------------|--------------|
| **Depth Limit** | None - drill infinitely | Yes - typically 15 levels |
| **Breadcrumbs** | Hidden | Visible with full path |
| **Navigation** | Back one level only | Jump to any previous level |
| **Page Refresh** | Returns to current level | Restores full path |
| **URL Length** | Short and clean | Contains full history |
| **Best For** | Deep exploration | Structured navigation |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Backspace** | Go back one level |
| **Alt + ←** | Browser back (works in both modes) |
| **Alt + →** | Browser forward (works in both modes) |

---

## Troubleshooting

### "Maximum drill-down depth reached"
**Cause**: You've reached the configured depth limit (Limited Mode only)  
**Solution**: Click the back arrow or a breadcrumb to go back, then explore a different path

### Breadcrumbs not showing
**Cause**: System is in Unlimited Mode  
**Solution**: This is normal - use the back arrow to navigate back

### Page refresh lost my drill-down path
**Cause**: System is in Unlimited Mode  
**Solution**: This is expected behavior - use browser back button or re-drill to your desired view

### Link is not clickable
**Possible Causes**:
1. You've reached the depth limit (Limited Mode)
2. The column doesn't have drill-down configured
3. No related data exists for that value

---

## Best Practices

### For Unlimited Mode
- ✅ Use browser bookmarks to save important views
- ✅ Keep track of your navigation mentally or with notes
- ✅ Use browser back button for multi-step navigation
- ❌ Don't rely on page refresh to preserve your path

### For Limited Mode
- ✅ Use breadcrumbs for quick navigation
- ✅ Bookmark complex drill-down paths via URL
- ✅ Watch the breadcrumb trail to avoid getting lost
- ❌ Don't drill too deep - use breadcrumbs to reset if needed

---

## Contact Your Administrator

If you need to:
- Change between Unlimited and Limited modes
- Adjust the depth limit
- Configure drill-down for additional columns
- Report issues with drill-down functionality

Contact your system administrator for assistance.
