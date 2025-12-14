# Column Visibility & Hiding - Quick Guide

## ✅ **Feature Enabled!**

I've enabled AG Grid's **Column Tool Panel** which allows users to show/hide columns and column groups.

---

## 🎯 **How to Use**

### **Opening the Column Panel:**

1. **Look for the sidebar button** on the right side of the grid
2. **Click the "Columns" button** (looks like a list icon)
3. **Panel slides out** showing all columns and groups

### **Show/Hide Individual Columns:**

- **Checkbox next to column name** - Click to show/hide
- **Hidden columns** - Unchecked
- **Visible columns** - Checked

### **Show/Hide Column Groups:**

Your grid has these column groups:
- **Personal Info** (Full Name, Email, Phone)
- **Employment** (Department, Salary, Join Date, Status)
- **Details** (Location)
- **Performance** (Rating, Experience, Manager)

**To hide/show a group:**
- Click the checkbox next to the group name
- All columns in that group will hide/show together

---

## 🔧 **Configuration Added**

### **Template** (`dynamic-grid.html`):
```html
<ag-grid-angular
  [sideBar]="sideBarConfig"
  ...
></ag-grid-angular>
```

### **Component** (`dynamic-grid.ts`):
```typescript
sideBarConfig = {
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columns',
      toolPanel: 'agColumnsToolPanel',
      toolPanelParams: {
        suppressColumnFilter: false,      // Show search box
        suppressColumnSelectAll: false,   // Show "Select All" checkbox
        suppressColumnExpandAll: false    // Show expand/collapse all
      }
    }
  ],
  defaultToolPanel: ''  // Closed by default
};
```

---

## 🎨 **Features Available**

✅ **Search Columns** - Search box at top of panel
✅ **Select All/None** - Checkbox to show/hide all columns
✅ **Expand/Collapse Groups** - Click arrow to expand/collapse groups
✅ **Drag to Reorder** - Drag columns to reorder them
✅ **Persistent State** - Column visibility persists during session

---

## 🚀 **Test Now**

1. **Refresh browser** (Ctrl+Shift+R)
2. **Load grid** with employee data
3. **Click "Columns" button** on right side
4. **Try hiding columns**:
   - Uncheck "Email" → Email column disappears
   - Uncheck "Personal Info" → All personal columns disappear
5. **Try showing them again**:
   - Check "Email" → Email column reappears

---

## 📝 **Additional Options**

### **Open Panel by Default:**
```typescript
sideBarConfig = {
  toolPanels: [...],
  defaultToolPanel: 'columns'  // Opens columns panel on load
};
```

### **Add Filters Panel:**
```typescript
sideBarConfig = {
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columns',
      toolPanel: 'agColumnsToolPanel'
    },
    {
      id: 'filters',
      labelDefault: 'Filters',
      toolPanel: 'agFiltersToolPanel'
    }
  ]
};
```

---

## 🎉 **Summary**

Column visibility panel is now enabled! Users can:
- Show/hide individual columns
- Show/hide entire column groups
- Search for columns
- Reorder columns via drag-and-drop
- Expand/collapse column groups

The panel appears on the right side of the grid when the "Columns" button is clicked! 🚀
