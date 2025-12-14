# Stored Procedures with Entity Framework Core - Quick Reference

## Three Ways to Call Stored Procedures in EF Core

### 1. **SqlQueryRaw<T>** - For Queries Returning Data (Recommended)

**Use Case:** Calling stored procedures that return result sets

```csharp
// Returns List<EmployeeDto>
var employees = await _context.Database
    .SqlQueryRaw<EmployeeDto>(
        "EXEC sp_GetEmployeesWithDepartment @PageNumber, @PageSize",
        new SqlParameter("@PageNumber", pageNumber),
        new SqlParameter("@PageSize", pageSize)
    )
    .ToListAsync();
```

**Key Points:**
- ✅ Returns `IQueryable<T>` - can chain LINQ operations
- ✅ Type-safe - maps to your DTO/Entity
- ✅ Best for SELECT queries
- ⚠️ DTO properties must match SP column names exactly (case-insensitive)

---

### 2. **ExecuteSqlRaw** - For Commands (INSERT/UPDATE/DELETE)

**Use Case:** Calling stored procedures that don't return data or have OUTPUT parameters

```csharp
// With OUTPUT parameter
var countParam = new SqlParameter("@TotalCount", SqlDbType.Int) 
{ 
    Direction = ParameterDirection.Output 
};

await _context.Database.ExecuteSqlRawAsync(
    "EXEC sp_GetEmployeeCount @SearchTerm, @TotalCount OUTPUT",
    new SqlParameter("@SearchTerm", searchTerm ?? (object)DBNull.Value),
    countParam
);

var totalCount = (int)countParam.Value;
```

**Key Points:**
- ✅ Returns number of rows affected
- ✅ Supports OUTPUT parameters
- ✅ Best for INSERT/UPDATE/DELETE operations
- ⚠️ Cannot return result sets directly

---

### 3. **FromSqlRaw** - For Entity Queries

**Use Case:** When querying entities directly (not DTOs)

```csharp
// Must configure EmployeeDto as keyless entity first
var employees = await _context.Set<EmployeeDto>()
    .FromSqlRaw(
        "EXEC sp_GetEmployeesWithDepartment @PageNumber, @PageSize",
        new SqlParameter("@PageNumber", pageNumber),
        new SqlParameter("@PageSize", pageSize)
    )
    .ToListAsync();
```

**DbContext Configuration Required:**
```csharp
// In ApplicationDbContext.OnModelCreating
modelBuilder.Entity<EmployeeDto>()
    .HasNoKey()
    .ToView(null); // Not mapped to a table/view
```

**Key Points:**
- ✅ Can chain LINQ operations after the call
- ✅ Integrates with EF tracking (if not keyless)
- ⚠️ Requires entity configuration in DbContext

---

## Parameter Handling Best Practices

### Handling Nullable Parameters

```csharp
// ❌ WRONG - Will throw exception if null
new SqlParameter("@SearchTerm", searchTerm)

// ✅ CORRECT - Handles null properly
new SqlParameter("@SearchTerm", searchTerm ?? (object)DBNull.Value)

// ✅ ALTERNATIVE - More explicit
new SqlParameter("@SearchTerm", (object?)searchTerm ?? DBNull.Value)
```

### Named vs Positional Parameters

```csharp
// Named parameters (Recommended)
"EXEC sp_GetEmployees @PageNumber, @PageSize, @SearchTerm"

// Positional parameters (Works but less readable)
"EXEC sp_GetEmployees {0}, {1}, {2}"
```

### OUTPUT Parameters

```csharp
var outputParam = new SqlParameter
{
    ParameterName = "@TotalCount",
    SqlDbType = SqlDbType.Int,
    Direction = ParameterDirection.Output
};

await _context.Database.ExecuteSqlRawAsync(
    "EXEC sp_GetCount @TotalCount OUTPUT",
    outputParam
);

int result = (int)outputParam.Value;
```

---

## Complete Example: Employee Service with SPs

```csharp
public class EmployeeService : IEmployeeService
{
    private readonly ApplicationDbContext _context;

    public async Task<EmployeeListResponse> GetEmployeesAsync(
        int pageNumber, 
        int pageSize, 
        string? searchTerm = null)
    {
        // 1. Get employee data using stored procedure
        var parameters = new[]
        {
            new SqlParameter("@PageNumber", pageNumber),
            new SqlParameter("@PageSize", pageSize),
            new SqlParameter("@SearchTerm", searchTerm ?? (object)DBNull.Value)
        };

        var employees = await _context.Database
            .SqlQueryRaw<EmployeeDto>(
                "EXEC sp_GetEmployeesWithDepartment @PageNumber, @PageSize, @SearchTerm",
                parameters
            )
            .ToListAsync();

        // 2. Get total count using OUTPUT parameter
        var countParam = new SqlParameter("@TotalCount", SqlDbType.Int) 
        { 
            Direction = ParameterDirection.Output 
        };

        await _context.Database.ExecuteSqlRawAsync(
            "EXEC sp_GetEmployeeCount @SearchTerm, @TotalCount OUTPUT",
            new SqlParameter("@SearchTerm", searchTerm ?? (object)DBNull.Value),
            countParam
        );

        var totalCount = (int)countParam.Value;

        // 3. Build response
        return new EmployeeListResponse
        {
            Employees = employees,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }
}
```

---

## Common Pitfalls & Solutions

### ❌ Problem: "Invalid column name" error

**Cause:** DTO property names don't match SP column names

```csharp
// ❌ Stored Procedure returns "FirstName"
// ❌ DTO has property "Name"
public class EmployeeDto 
{ 
    public string Name { get; set; } // Won't map!
}
```

**Solution:** Use aliases in SP or match property names

```sql
-- ✅ Use alias to match DTO property
SELECT CONCAT(FirstName, ' ', LastName) AS Name
```

---

### ❌ Problem: "Cannot insert explicit value for identity column"

**Cause:** Trying to insert into IDENTITY column

**Solution:** Use `SET IDENTITY_INSERT` or don't include ID in INSERT

```sql
-- ✅ Don't include Id in INSERT SP
CREATE PROCEDURE sp_InsertEmployee
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50)
AS
BEGIN
    INSERT INTO Employees (FirstName, LastName)
    VALUES (@FirstName, @LastName);
    
    SELECT SCOPE_IDENTITY() AS Id; -- Return new ID
END
```

---

### ❌ Problem: Null reference exception with OUTPUT parameter

**Cause:** Accessing Value before execution completes

```csharp
// ❌ WRONG
var param = new SqlParameter("@Count", SqlDbType.Int) { Direction = ParameterDirection.Output };
var count = (int)param.Value; // Value is null here!
await _context.Database.ExecuteSqlRawAsync("EXEC sp_GetCount @Count OUTPUT", param);

// ✅ CORRECT
var param = new SqlParameter("@Count", SqlDbType.Int) { Direction = ParameterDirection.Output };
await _context.Database.ExecuteSqlRawAsync("EXEC sp_GetCount @Count OUTPUT", param);
var count = (int)param.Value; // Access after execution
```

---

## Performance Tips

### 1. Use `AsNoTracking()` for Read-Only Queries

```csharp
// If using FromSqlRaw with entities
var employees = await _context.Employees
    .FromSqlRaw("EXEC sp_GetEmployees")
    .AsNoTracking() // Faster for read-only
    .ToListAsync();
```

### 2. Avoid N+1 Queries - Use JOINs in SP

```sql
-- ✅ GOOD - Single query with JOIN
SELECT e.*, d.Name AS Department
FROM Employees e
INNER JOIN Departments d ON e.DepartmentId = d.Id

-- ❌ BAD - Would require multiple queries if done in LINQ
```

### 3. Use Compiled Queries for Frequently Called SPs

```csharp
private static readonly Func<ApplicationDbContext, int, Task<List<EmployeeDto>>> 
    GetEmployeesCompiled = EF.CompileAsyncQuery(
        (ApplicationDbContext context, int pageSize) =>
            context.Set<EmployeeDto>()
                .FromSqlRaw("EXEC sp_GetEmployees @PageSize", 
                    new SqlParameter("@PageSize", pageSize))
                .ToList()
    );
```

---

## Security Considerations

### ✅ Always Use Parameterized Queries

```csharp
// ✅ SAFE - Parameterized
var employees = await _context.Database
    .SqlQueryRaw<EmployeeDto>(
        "EXEC sp_GetEmployees @SearchTerm",
        new SqlParameter("@SearchTerm", searchTerm)
    )
    .ToListAsync();

// ❌ DANGEROUS - SQL Injection risk!
var employees = await _context.Database
    .SqlQueryRaw<EmployeeDto>($"EXEC sp_GetEmployees '{searchTerm}'")
    .ToListAsync();
```

### ✅ Grant Minimal Permissions

```sql
-- Only grant EXECUTE on specific stored procedures
GRANT EXECUTE ON sp_GetEmployeesWithDepartment TO [AppUser];
-- Don't grant direct table access
```

---

## Testing Stored Procedures

### Unit Testing with InMemory Database

```csharp
// Note: InMemory provider doesn't support stored procedures
// Use SQL Server for integration tests

[Fact]
public async Task GetEmployees_ReturnsData()
{
    // Arrange
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseSqlServer("Server=localhost;Database=TestDb;Trusted_Connection=True;")
        .Options;

    using var context = new ApplicationDbContext(options);
    var service = new EmployeeService(context);

    // Act
    var result = await service.GetEmployeesAsync(1, 10);

    // Assert
    Assert.NotNull(result);
    Assert.True(result.Employees.Count > 0);
}
```

---

## Summary: When to Use Each Approach

| Method | Use Case | Returns | Can Chain LINQ |
|--------|----------|---------|----------------|
| `SqlQueryRaw<T>` | SELECT queries → DTO | `IQueryable<T>` | ❌ No |
| `FromSqlRaw` | SELECT queries → Entity | `IQueryable<T>` | ✅ Yes |
| `ExecuteSqlRaw` | INSERT/UPDATE/DELETE | `int` (rows affected) | ❌ No |

**Recommendation for GridPortal:**
- Use `SqlQueryRaw<EmployeeDto>` for the grid query (complex JOIN)
- Use `ExecuteSqlRaw` for count with OUTPUT parameter
- Use LINQ for simple department list query
