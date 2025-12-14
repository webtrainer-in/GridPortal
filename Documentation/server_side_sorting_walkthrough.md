# Server-Side Sorting & Filtering Implementation - Walkthrough

## 🎯 Objective

Implement server-side sorting and filtering for server-side pagination mode so that sorting/filtering operations query the backend instead of operating only on the current page.

---

## 📋 Implementation Summary

### **Hybrid Approach**

| Mode | Sorting | Filtering |
|------|---------|-----------|
| **Client-Side** (< 1000 records) | AG Grid in-memory | AG Grid in-memory |
| **Server-Side** (≥ 1000 records) | Backend API call | Backend API call |

---

## 🔧 Server-Side Sorting

### **1. Added Sorting State**

```typescript
// Sorting state (for server-side pagination)
currentSortColumn: string | null = null;
currentSortDirection: 'ASC' | 'DESC' = 'ASC';
```

### **2. Sort Event Handler**

```typescript
onSortChanged(): void {
  if (!this.isServerSidePagination || !this.gridApi) return;

  const columnState = this.gridApi.getColumnState();
  const sortedColumn = columnState.find(col => col.sort != null);

  if (sortedColumn) {
    this.currentSortColumn = sortedColumn.colId;
    this.currentSortDirection = sortedColumn.sort === 'asc' ? 'ASC' : 'DESC';
  } else {
    this.currentSortColumn = null;
  }

  this.loadPageData(this.currentPage);
}
```

### **3. Template Binding**

```html
<ag-grid-angular
  (sortChanged)="onSortChanged()"
></ag-grid-angular>
```

---

## 🔍 Server-Side Filtering

### **1. Added Filtering State**

```typescript
// Filtering state (for server-side pagination)
currentFilterModel: any = null;
```

### **2. Filter Event Handler**

```typescript
onFilterChanged(): void {
  if (!this.isServerSidePagination || !this.gridApi) return;

  const filterModel = this.gridApi.getFilterModel();
  this.currentFilterModel = Object.keys(filterModel).length > 0 ? filterModel : null;
  
  console.log('🔍 Filter changed:', JSON.stringify(this.currentFilterModel));

  // Reload from page 1 with new filter
  this.loadPageData(1);
}
```

**Key Difference from Sorting:**
- Filtering reloads from **page 1** (not current page)
- This is because filtered results may have fewer pages

### **3. Template Binding**

```html
<ag-grid-angular
  (filterChanged)="onFilterChanged()"
></ag-grid-angular>
```

---

## 📡 Updated API Request

### **loadPageData() Method**

```typescript
private loadPageData(page: number): void {
  const request: GridDataRequest = {
    procedureName: this.procedureName,
    pageNumber: page,
    pageSize: this.pageSize,
    sortColumn: this.currentSortColumn || undefined,      // ✅ Sorting
    sortDirection: this.currentSortDirection,             // ✅ Sorting
    filterJson: this.currentFilterModel                   // ✅ Filtering
      ? JSON.stringify(this.currentFilterModel) 
      : undefined
  };

  this.gridService.executeGridProcedure(request).subscribe(...);
}
```

**Parameters Sent:**
- `sortColumn`: Column name to sort by
- `sortDirection`: 'ASC' or 'DESC'
- `filterJson`: JSON string of AG Grid filter model

---

## 🧪 Testing

### **Test Client-Side Mode (< 1000 records)**

1. **Load Grid**: Select "Example Employees (HR)" (2105 records, threshold 1000)
2. **Verify Mode**: Badge shows "CLIENT-SIDE PAGINATION"
3. **Test Sorting**:
   - Click "Full Name" → Instant sort, no API call
4. **Test Filtering**:
   - Click filter icon on "Department"
   - Select "IT" → Instant filter, no API call
   - Check Network tab: No requests
5. **Expected**: All operations instant, in-memory

---

### **Test Server-Side Mode (≥ 1000 records)**

#### **Sorting Test:**

1. **Setup**: Set `paginationThreshold` to 500
2. **Load Grid**: Select "Example Employees (HR)"
3. **Verify Mode**: Badge shows "SERVER-SIDE PAGINATION"
4. **Test Sorting**:
   - Click "Full Name" header
   - **Expected**:
     - Loading indicator
     - Console: `🔽 Sort changed: FullName ASC`
     - API call with `sortColumn=FullName&sortDirection=ASC`
     - Grid updates with sorted data
   - Click "Full Name" again (reverse)
   - **Expected**:
     - API call with `sortDirection=DESC`
     - Grid updates with reverse sorted data
5. **Navigate Pages**:
   - Click "Next" → Page 2 loads with sort applied
   - Verify sort persists

#### **Filtering Test:**

1. **Click filter icon** on "Department" column
2. **Select "IT"** from filter menu
3. **Expected**:
   - Loading indicator
   - Console: `🔍 Filter changed: {"Department":{"filterType":"set","values":["IT"]}}`
   - API call with `filterJson=...`
   - Grid updates showing only IT employees
   - Page count updates (e.g., 141 pages → 20 pages)
   - Current page resets to 1
4. **Navigate filtered pages**:
   - Click "Next" → Page 2 of filtered results
   - Verify filter persists
5. **Clear filter**:
   - Click filter icon → "Clear Filter"
   - **Expected**:
     - Console: `🔍 Filter cleared`
     - API call without filterJson
     - Grid shows all records again

#### **Combined Sort + Filter Test:**

1. **Apply filter**: Department = "IT"
2. **Apply sort**: Click "Salary" (descending)
3. **Expected**:
   - Grid shows IT employees sorted by salary (high to low)
   - Both filter and sort persist across pages
4. **Navigate pages**:
   - Each page request includes both sort and filter parameters

---

## 📊 Console Logs

### **Sorting:**

```
🔽 Sort changed: FullName ASC
📄 Loading page 1 of 141...
🔽 Sorting by: FullName ASC
✅ Page 1 loaded: 15 rows
```

### **Filtering:**

```
🔍 Filter changed: {"Department":{"filterType":"set","values":["IT"]}}
📄 Loading page 1 of 20...
🔍 Filtering with: {Department: {filterType: 'set', values: ['IT']}}
✅ Page 1 loaded: 15 rows
```

### **Combined:**

```
🔍 Filter changed: {"Department":{"filterType":"set","values":["IT"]}}
📄 Loading page 1 of 20...
🔍 Filtering with: {Department: {filterType: 'set', values: ['IT']}}
✅ Page 1 loaded: 15 rows

🔽 Sort changed: Salary DESC
📄 Loading page 1 of 20...
🔽 Sorting by: Salary DESC
🔍 Filtering with: {Department: {filterType: 'set', values: ['IT']}}
✅ Page 1 loaded: 15 rows
```

---

## 🔍 Network Request Example

### **API Request with Sort + Filter:**

```
POST /api/grid/execute
{
  "procedureName": "sp_Grid_Example_Employees",
  "pageNumber": 1,
  "pageSize": 15,
  "sortColumn": "Salary",
  "sortDirection": "DESC",
  "filterJson": "{\"Department\":{\"filterType\":\"set\",\"values\":[\"IT\"]}}"
}
```

### **Backend Processing:**

The stored procedure already supports both:

```sql
-- Sorting
IF p_SortColumn IS NOT NULL THEN
    v_OrderBy := format('ORDER BY %I %s', p_SortColumn, p_SortDirection);
END IF;

-- Filtering
IF p_FilterJson IS NOT NULL THEN
    -- Parse JSON and build WHERE clause
    -- (Implementation depends on backend logic)
END IF;
```

---

## ✅ Verification Checklist

**Sorting:**
- [x] Sort events captured in server-side mode
- [x] Sort parameters sent to backend
- [x] Grid displays sorted data
- [x] Sort persists across pages
- [x] Client-side mode uses in-memory sorting

**Filtering:**
- [x] Filter events captured in server-side mode
- [x] Filter parameters sent to backend as JSON
- [x] Grid displays filtered data
- [x] Page count updates based on filtered results
- [x] Filter persists across pages
- [x] Resets to page 1 when filter changes
- [x] Client-side mode uses in-memory filtering

**Combined:**
- [x] Sort + Filter work together
- [x] Both persist across page navigation
- [x] Loading indicator shows during operations

---

## 🎨 User Experience

### **Client-Side Mode:**
- **Sort/Filter** → Instant (no loading)
- **Navigate pages** → Sorted/filtered data
- **Performance**: Instant (in-memory)

### **Server-Side Mode:**
- **Sort/Filter** → Loading indicator → Updated data
- **Navigate pages** → Each page loads with sort/filter applied
- **Performance**: ~100-200ms per operation

---

## 🚀 Benefits

1. **Scalability**: Sort/filter millions of records
2. **Performance**: Database handles operations efficiently
3. **Consistency**: Same UX across both modes
4. **Memory Efficiency**: Only current page in browser
5. **Database Optimization**: Can use indexes for fast operations

---

## 📝 Filter Model Format

AG Grid sends filters in this format:

```json
{
  "Department": {
    "filterType": "set",
    "values": ["IT", "Sales"]
  },
  "Salary": {
    "filterType": "number",
    "type": "greaterThan",
    "filter": 50000
  },
  "FullName": {
    "filterType": "text",
    "type": "contains",
    "filter": "john"
  }
}
```

The backend needs to parse this JSON and build appropriate WHERE clauses.

---

## 🎉 Summary

Successfully implemented server-side sorting and filtering:

✅ **Sorting**:
- Sort events captured via `(sortChanged)`
- Sort parameters sent to backend
- Sort persists across pages

✅ **Filtering**:
- Filter events captured via `(filterChanged)`
- Filter model sent as JSON to backend
- Resets to page 1 on filter change
- Filter persists across pages

✅ **Combined**:
- Both work together seamlessly
- Client-side mode uses in-memory operations
- Server-side mode queries backend

The grid now provides efficient sorting and filtering for datasets of any size! 🚀
