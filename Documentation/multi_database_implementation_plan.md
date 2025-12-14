# Multi-Database Support Implementation Plan

## Goal

Enable the dynamic grid system to execute stored procedures across multiple databases by adding database routing capabilities based on procedure metadata in the `StoredProcedureRegistry`.

## Architecture Overview

**Pattern:** Database per Procedure
- Each procedure in the registry can specify which database it belongs to
- `DbContextFactory` creates connections to different databases
- `DynamicGridService` routes procedure calls to the correct database
- Configuration-driven (connection strings in `appsettings.json`)

---

## Proposed Changes

### **1. Database Schema**

#### Add DatabaseName Column
**File:** `add-database-name-column.sql` (NEW)

```sql
ALTER TABLE "StoredProcedureRegistry"
ADD COLUMN "DatabaseName" VARCHAR(100);

COMMENT ON COLUMN "StoredProcedureRegistry"."DatabaseName" IS 
'Database identifier for routing procedure calls (e.g., PowerSystem, HR, Finance)';
```

#### Update Existing Records
**File:** `update-database-names.sql` (NEW)

```sql
-- Set database names for existing procedures
UPDATE "StoredProcedureRegistry"
SET "DatabaseName" = 'PowerSystem'
WHERE "ProcedureName" LIKE '%Bus%';

UPDATE "StoredProcedureRegistry"
SET "DatabaseName" = 'HR'
WHERE "ProcedureName" LIKE '%Employee%';
```

---

### **2. C# Model Updates**

#### StoredProcedureRegistry Model
**File:** [`StoredProcedureRegistry.cs`](file:///c:/Studymash/GridPortal/API/WebAPI/Models/StoredProcedureRegistry.cs)

**Changes:**
- Add `DatabaseName` property
- Add XML documentation

```csharp
/// <summary>
/// Database identifier for routing procedure calls.
/// Maps to connection string names in appsettings.json.
/// If null, uses DefaultConnection.
/// </summary>
[MaxLength(100)]
public string? DatabaseName { get; set; }
```

---

### **3. Database Context Factory**

#### IDbContextFactory Interface
**File:** `IDbContextFactory.cs` (NEW)

```csharp
public interface IDbContextFactory
{
    ApplicationDbContext CreateContext(string? databaseName = null);
    Task<DbConnection> CreateConnectionAsync(string? databaseName = null);
}
```

#### DbContextFactory Implementation
**File:** `DbContextFactory.cs` (NEW)

**Responsibilities:**
- Resolve connection strings from configuration
- Create `ApplicationDbContext` instances for different databases
- Provide raw `DbConnection` for procedure execution
- Handle fallback to default connection

---

### **4. Service Updates**

#### DynamicGridService
**File:** [`DynamicGridService.cs`](file:///c:/Studymash/GridPortal/API/WebAPI/Services/DynamicGridService.cs)

**Changes:**
1. Inject `IDbContextFactory`
2. Update `ExecuteGridProcedureAsync` to use factory
3. Update `UpdateRowAsync` to use factory
4. Update `DeleteRowAsync` to use factory
5. Add logging for database routing

**Key Logic:**
```csharp
// Get procedure metadata
var procedure = await _context.StoredProcedureRegistry
    .FirstOrDefaultAsync(p => p.ProcedureName == request.ProcedureName);

// Get database name from procedure
var databaseName = procedure?.DatabaseName;

// Create connection to target database
var connection = await _dbContextFactory.CreateConnectionAsync(databaseName);
```

---

### **5. Configuration**

#### appsettings.json
**File:** [`appsettings.json`](file:///c:/Studymash/GridPortal/API/WebAPI/appsettings.json)

**Changes:**
Add multiple connection strings:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=GridPortal;...",
    "PowerSystem": "Host=localhost;Database=PowerSystemDB;...",
    "HR": "Host=localhost;Database=HumanResourcesDB;...",
    "Finance": "Host=localhost;Database=FinanceDB;..."
  }
}
```

#### appsettings.Development.json
**File:** [`appsettings.Development.json`](file:///c:/Studymash/GridPortal/API/WebAPI/appsettings.Development.json)

**Changes:**
Add development-specific connection strings

---

### **6. Dependency Injection**

#### Program.cs
**File:** [`Program.cs`](file:///c:/Studymash/GridPortal/API/WebAPI/Program.cs)

**Changes:**
```csharp
// Register DbContextFactory
builder.Services.AddScoped<IDbContextFactory, DbContextFactory>();

// Keep default context for registry lookups
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));
```

---

## Implementation Steps

### **Phase 1: Database Migration**
1. ✅ Create `add-database-name-column.sql`
2. ✅ Create `update-database-names.sql`
3. ✅ Execute migrations on database

### **Phase 2: Model & Factory**
4. ✅ Update `StoredProcedureRegistry.cs` model
5. ✅ Create `IDbContextFactory.cs` interface
6. ✅ Create `DbContextFactory.cs` implementation

### **Phase 3: Service Updates**
7. ✅ Update `DynamicGridService.cs` constructor
8. ✅ Update `ExecuteGridProcedureAsync` method
9. ✅ Update `UpdateRowAsync` method
10. ✅ Update `DeleteRowAsync` method

### **Phase 4: Configuration**
11. ✅ Update `appsettings.json`
12. ✅ Update `appsettings.Development.json`
13. ✅ Update `Program.cs` DI registration

### **Phase 5: Testing**
14. ✅ Test Bus grid (PowerSystem database)
15. ✅ Test Employee grid (HR database)
16. ✅ Test CRUD operations across databases
17. ✅ Verify fallback to default connection

---

## Backward Compatibility

✅ **Fully backward compatible:**
- If `DatabaseName` is NULL → Uses `DefaultConnection`
- Existing procedures continue to work without changes
- No breaking changes to API contracts

---

## Benefits

✅ **Scalability** - Add new databases without code changes
✅ **Flexibility** - Each procedure can use different database
✅ **Maintainability** - Configuration-driven routing
✅ **Security** - Connection strings centralized in config
✅ **Performance** - Direct connections to target databases

---

## Example Usage

### **Before (Single Database)**
```
All procedures → DefaultConnection → GridPortal database
```

### **After (Multi-Database)**
```
sp_Grid_Buses → PowerSystem → PowerSystemDB
sp_Grid_Employees → HR → HumanResourcesDB
sp_Grid_Invoices → Finance → FinanceDB
sp_Grid_Other → DefaultConnection → GridPortal (fallback)
```

---

## Testing Checklist

- [ ] Database migration executes successfully
- [ ] Model updated with DatabaseName property
- [ ] DbContextFactory creates correct connections
- [ ] Bus grid loads from PowerSystem database
- [ ] Employee grid loads from HR database
- [ ] Update operations work across databases
- [ ] Delete operations work across databases
- [ ] NULL DatabaseName falls back to default
- [ ] Invalid DatabaseName logs error and uses default
- [ ] Connection pooling works correctly

---

## Rollback Plan

If issues occur:

1. **Remove DatabaseName column:**
   ```sql
   ALTER TABLE "StoredProcedureRegistry"
   DROP COLUMN "DatabaseName";
   ```

2. **Revert service changes** (Git revert)

3. **Remove factory registration** from `Program.cs`

All procedures will fall back to default connection.
