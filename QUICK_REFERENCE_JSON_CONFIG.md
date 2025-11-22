# Quick Reference: JSON Menu Configuration

## What Changed

### ✅ Completed
- All menu data moved from TypeScript to `menu-config.json`
- New `MenuConfigLoaderService` loads JSON configuration
- `MenuDataService` refactored to use JSON loader
- App configured with `provideHttpClient()`
- **Zero breaking changes** - all public APIs remain the same

### ❌ Removed
- `customMenuItems` (hardcoded sidebar menus)
- `menuPanelConfigs` (hardcoded tab configs)
- `menuData` (hardcoded main tab content)
- `userInfoData` (hardcoded user-info tab content)
- `permissionData` (hardcoded permission tab content)

### ✅ New Files
- `src/assets/data/menu-config.json` - All menu configuration
- `src/core/services/menu-config-loader.service.ts` - JSON loader service

---

## Usage Examples

### Get All Menus
```typescript
// In component
menuDataService.getMenuItems().subscribe(menus => {
  console.log(menus); // Works as before!
});
```

### Get Menu Tabs
```typescript
const tabs = menuDataService.getTabsForMenu('dashboard');
// Returns: [{ id: 'main', label: 'User Management', icon: 'pi pi-users' }, ...]
```

### Get Tab Content
```typescript
menuDataService.getMenuContent('users').subscribe(content => {
  console.log(content); // Main tab content
});
```

---

## JSON Structure

```json
{
  "version": "1.0",
  "menus": [
    {
      "id": "dashboard",
      "label": "Dashboard",
      "icon": "pi pi-home",
      "routerLink": "/dashboard",
      "displayTitle": "Dashboard Explorer",
      "hasTabs": true,
      "tabs": [
        {
          "id": "main",
          "label": "User Management",
          "icon": "pi pi-users",
          "content": [
            { "label": "Overview", "icon": "...", "type": "item", "route": "..." }
          ]
        }
      ]
    }
  ]
}
```

---

## How to Modify Menus

### Edit Menu Label
Edit `src/assets/data/menu-config.json`:
```json
{
  "id": "dashboard",
  "label": "Dashboard New Title",  // ← Change here
  ...
}
```

### Add New Tab
```json
{
  "id": "dashboard",
  ...
  "tabs": [
    { "id": "main", "label": "Main", ... },
    { "id": "user-info", "label": "User Info", ... },
    { "id": "permission", "label": "Permission", ... },
    {
      "id": "audit-log",  // ← NEW TAB
      "label": "Audit Log",
      "icon": "pi pi-history",
      "content": [ ... ]
    }
  ]
}
```

### Add Menu Item
```json
{
  "id": "users",
  "tabs": [
    {
      "id": "main",
      "content": [
        { "label": "All Users", ... },
        {
          "label": "New Item",  // ← NEW ITEM
          "icon": "pi pi-plus",
          "type": "item",
          "route": "/new-route"
        }
      ]
    }
  ]
}
```


### MenuDataService

```typescript
// Load sidebar menus
getMenuItems(): Observable<SidebarMenuItem[]>

// Get tab list for a menu
getTabsForMenu(menuId: string): TabConfig[]

// Check if menu has tabs
hasTabsForMenu(menuId: string): boolean

// Get menu title
getMenuDisplayTitle(menuId: string): string

// Get menu panel config
getMenuPanelConfig(menuId: string): MenuPanelConfig | null

// Get main tab content
getMenuContent(menuType: string): Observable<MenuItem[]>

// Get user-info tab content
getUserInfoContent(menuType: string): Observable<MenuItem[]>

// Get permission tab content
getPermissionContent(menuType: string): Observable<MenuItem[]>

// Get any tab content
getTabContent(menuType: string, tabType: string): Observable<MenuItem[]>
```

---

## Component Usage (No Changes!)

### Sidebar Component
```typescript
// Still works exactly the same
this.menuDataService.getMenuItems().subscribe(items => {
  this.menus = items;
});
```

### Secondary Panel Component
```typescript
// Still works exactly the same
this.hasTabsForMenu = this.menuDataService.hasTabsForMenu(menuId);
this.tabs = this.menuDataService.getTabsForMenu(menuId);
```

---

## File Locations

```
Frontend/
├── src/
│   ├── assets/
│   │   └── data/
│   │       └── menu-config.json (NEW)
│   ├── core/
│   │   └── services/
│   │       ├── menu-data.service.ts (REFACTORED)
│   │       └── menu-config-loader.service.ts (NEW)
│   └── app/
│       └── app.config.ts (UPDATED)
```

### Data Flow
```
menu-config.json (JSON file)
        ↓
MenuConfigLoaderService (loads & caches)
        ↓
MenuDataService (transforms to types)
        ↓
Components (sidebar, tabs, content)
        ↓
User (sees menus as before)
```

## Performance Notes

- JSON file loaded once on app initialization
- Cached in memory after first load
- All subsequent requests use cache
- No performance impact
- Actual loading happens asynchronously

