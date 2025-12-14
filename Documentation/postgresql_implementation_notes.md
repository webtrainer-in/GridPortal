# PostgreSQL Implementation Notes

## Issue: Database Platform Difference

The original implementation plan was written for **SQL Server**, but your project uses **PostgreSQL**. This requires adjustments to the stored procedure approach.

## Key Differences

### SQL Server
- Supports multiple result sets from a single stored procedure
- Can return 3 separate SELECT statements
- EF Core reads them sequentially with `DbDataReader.NextResultAsync()`

### PostgreSQL
- Functions return a single result set
- Multiple result sets require different approaches
- Need to adapt the implementation strategy

## Recommended Approach for PostgreSQL

### **Option 1: Single JSON Response** ⭐ RECOMMENDED

Return all data as a single JSON object:

```sql
CREATE OR REPLACE FUNCTION sp_Grid_Example_Employees(...)
RETURNS JSONB AS $$
DECLARE
    v_data JSONB;
    v_columns JSONB;
    v_count INT;
BEGIN
    -- Build data array
    SELECT jsonb_agg(row_to_json(t)) INTO v_data
    FROM (...) t;
    
    -- Build columns array
    SELECT jsonb_agg(row_to_json(c)) INTO v_columns
    FROM (...) c;
    
    -- Get count
    SELECT COUNT(*) INTO v_count FROM ...;
    
    -- Return combined JSON
    RETURN jsonb_build_object(
        'rows', v_data,
        'columns', v_columns,
        'totalCount', v_count
    );
END;
$$ LANGUAGE plpgsql;
```

**C# Service Code:**
```csharp
var result = await _context.Database
    .SqlQueryRaw<string>(
        "SELECT sp_Grid_Example_Employees(@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)",
        parameters
    )
    .FirstOrDefaultAsync();

var jsonResponse = JsonSerializer.Deserialize<GridDataResponse>(result);
```

**Advantages:**
- ✅ Single database call
- ✅ Easier to parse
- ✅ Better performance
- ✅ Cleaner code

### **Option 2: Multiple Functions**

Create separate functions for each result set:

```sql
CREATE FUNCTION sp_Grid_Example_Employees_Data(...) RETURNS TABLE(...);
CREATE FUNCTION sp_Grid_Example_Employees_Columns(...) RETURNS TABLE(...);
CREATE FUNCTION sp_Grid_Example_Employees_Count(...) RETURNS INT;
```

**Disadvantages:**
- ❌ 3 database calls per grid load
- ❌ More complex service code
- ❌ Potential consistency issues

### **Option 3: Composite Type**

Define custom PostgreSQL type:

```sql
CREATE TYPE grid_response AS (
    rows JSONB,
    columns JSONB,
    total_count INT
);

CREATE FUNCTION sp_Grid_Example_Employees(...)
RETURNS grid_response AS $$...
```

**Disadvantages:**
- ❌ More complex setup
- ❌ Type management overhead

## Implementation Changes Required

### 1. Update Stored Procedure Template
- Change from multiple SELECT statements to single JSON return
- Use `jsonb_build_object` and `jsonb_agg`

### 2. Update DynamicGridService
- Change from `DbDataReader` with multiple result sets
- Parse single JSON response instead

### 3. No Changes Needed
- ✅ DTOs remain the same
- ✅ API controller remains the same
- ✅ Frontend remains the same
- ✅ Database schema remains the same

## Example: Complete PostgreSQL Function

```sql
CREATE OR REPLACE FUNCTION sp_Grid_Example_Employees(
    p_PageNumber INT DEFAULT 1,
    p_PageSize INT DEFAULT 15,
    p_StartRow INT DEFAULT NULL,
    p_EndRow INT DEFAULT NULL,
    p_SortColumn VARCHAR DEFAULT NULL,
    p_SortDirection VARCHAR DEFAULT 'ASC',
    p_FilterJson TEXT DEFAULT NULL,
    p_SearchTerm VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_Offset INT;
    v_FetchSize INT;
    v_Data JSONB;
    v_Columns JSONB;
    v_TotalCount INT;
BEGIN
    -- Calculate offset and fetch size
    IF p_StartRow IS NOT NULL THEN
        v_Offset := p_StartRow;
        v_FetchSize := p_EndRow - p_StartRow;
    ELSE
        v_Offset := (p_PageNumber - 1) * p_PageSize;
        v_FetchSize := p_PageSize;
    END IF;
    
    -- Get data rows
    SELECT jsonb_agg(row_to_json(t)) INTO v_Data
    FROM (
        SELECT 
            e."Id",
            e."FirstName" || ' ' || e."LastName" AS "FullName",
            e."Email",
            d."Name" AS "Department",
            e."Salary"
        FROM "Employees" e
        INNER JOIN "Departments" d ON e."DepartmentId" = d."Id"
        WHERE p_SearchTerm IS NULL 
           OR e."FirstName" ILIKE '%' || p_SearchTerm || '%'
        ORDER BY e."Id"
        OFFSET v_Offset LIMIT v_FetchSize
    ) t;
    
    -- Get column definitions
    SELECT jsonb_agg(row_to_json(c)) INTO v_Columns
    FROM (
        SELECT 'Id' AS field, 'ID' AS "headerName", 'number' AS type, 70 AS width
        UNION ALL
        SELECT 'FullName', 'Full Name', 'string', 200
        -- ... more columns
    ) c;
    
    -- Get total count
    SELECT COUNT(*) INTO v_TotalCount
    FROM "Employees" e
    WHERE p_SearchTerm IS NULL 
       OR e."FirstName" ILIKE '%' || p_SearchTerm || '%';
    
    -- Return combined response
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::jsonb),
        'columns', COALESCE(v_Columns, '[]'::jsonb),
        'totalCount', v_TotalCount
    );
END;
$$ LANGUAGE plpgsql;
```

## Service Layer Changes

```csharp
public async Task<GridDataResponse> ExecuteGridProcedureAsync(
    GridDataRequest request, 
    string[] userRoles)
{
    // Build parameters
    var parameters = new List<NpgsqlParameter>
    {
        new NpgsqlParameter("p_PageNumber", request.PageNumber),
        new NpgsqlParameter("p_PageSize", request.PageSize),
        // ... other parameters
    };

    // Execute function and get JSON result
    var sql = "SELECT sp_Grid_Example_Employees(@p_PageNumber, @p_PageSize, ...)";
    
    var jsonResult = await _context.Database
        .SqlQueryRaw<string>(sql, parameters.ToArray())
        .FirstOrDefaultAsync();

    if (string.IsNullOrEmpty(jsonResult))
    {
        return new GridDataResponse();
    }

    // Parse JSON response
    var jsonDoc = JsonDocument.Parse(jsonResult);
    var response = new GridDataResponse
    {
        Rows = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
            jsonDoc.RootElement.GetProperty("rows").GetRawText()
        ),
        Columns = JsonSerializer.Deserialize<List<ColumnDefinition>>(
            jsonDoc.RootElement.GetProperty("columns").GetRawText()
        ),
        TotalCount = jsonDoc.RootElement.GetProperty("totalCount").GetInt32(),
        PageNumber = request.PageNumber,
        PageSize = request.PageSize
    };

    response.TotalPages = (int)Math.Ceiling(response.TotalCount / (double)request.PageSize);
    
    return response;
}
```

## Migration Path

1. ✅ Keep all entity models as-is
2. ✅ Keep all DTOs as-is
3. ✅ Keep API controller as-is
4. ✅ Keep frontend as-is
5. ⚠️ Update stored procedure template (JSON response)
6. ⚠️ Update DynamicGridService (JSON parsing)

## Summary

**Recommendation:** Use **Option 1 (Single JSON Response)**

**Impact:**
- Minimal changes to overall architecture
- Actually simpler than multiple result sets
- Better performance
- PostgreSQL-native approach

**Next Steps:**
1. Create PostgreSQL function template
2. Update service layer for JSON parsing
3. Test with example data
4. Proceed with Phase 2

