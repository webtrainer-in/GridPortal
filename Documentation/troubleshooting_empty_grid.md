# Grid Not Loading - Troubleshooting Guide

## Issue Identified ✅

The grid is empty because the **PostgreSQL setup script hasn't been run yet**.

**API Test Result:**
```
GET http://localhost:5125/api/DynamicGrid/available-procedures
Response: []  ← Empty array means no procedures registered
```

## Solution: Run PostgreSQL Setup Script

### **Step 1: Open PostgreSQL Client**

Choose one of these options:
- **pgAdmin** (recommended)
- **DBeaver**
- **psql command line**
- **Azure Data Studio** with PostgreSQL extension

### **Step 2: Connect to Database**

Connection details:
- **Host:** localhost
- **Port:** 5432
- **Database:** GridPortalDb
- **Username:** postgres
- **Password:** pass@12345

### **Step 3: Execute Setup Script**

1. Open the SQL file: `API/WebAPI/Database/complete-setup.sql`
2. Copy the entire contents
3. Paste into your PostgreSQL client's query window
4. Execute the script (F5 or click Run)

**What the script does:**
- ✅ Creates `sp_Grid_Example_Employees` function
- ✅ Creates `sp_Grid_Update_Example_Employees` function
- ✅ Seeds 6 departments (IT, HR, Sales, Finance, Engineering, Operations)
- ✅ Seeds 5 example employees
- ✅ Registers the procedure in `StoredProcedureRegistry` table
- ✅ Tests the function and shows counts

### **Step 4: Verify Setup**

After running the script, you should see output like:

```
CREATE FUNCTION
CREATE FUNCTION
INSERT 0 6
INSERT 0 5
INSERT 0 1

-- Test results showing employee data
-- Count results:
Departments: 6
Employees: 5
StoredProcedureRegistry: 1
```

### **Step 5: Refresh the Grid**

1. Go back to your browser (http://localhost:4200)
2. Refresh the page (F5)
3. The dropdown should now show: **"Example Employees (HR)"**
4. Select it and click Refresh
5. You should see 5 employees in the grid

## Alternative: Run via psql Command Line

If you prefer command line:

```powershell
# Navigate to the database folder
cd C:\Studymash\GridPortal\API\WebAPI\Database

# Set password environment variable
$env:PGPASSWORD = "pass@12345"

# Run the script
psql -h localhost -p 5432 -U postgres -d GridPortalDb -f complete-setup.sql
```

## Expected Result After Setup

**Dropdown should show:**
```
-- Select a grid --
Example Employees (HR)
```

**Grid should display:**
```
┌─────────┬──────────────┬──────────────────────────┬────────────┬──────────┐
│ Actions │ Full Name    │ Email                    │ Department │ Salary   │
├─────────┼──────────────┼──────────────────────────┼────────────┼──────────┤
│ [Edit]  │ John Smith   │ john.smith@company.com   │ IT         │ $85,000  │
│ [Edit]  │ Jane Doe     │ jane.doe@company.com     │ HR         │ $75,000  │
│ [Edit]  │ Bob Wilson   │ bob.wilson@company.com   │ Sales      │ $90,000  │
│ [Edit]  │ Alice Brown  │ alice.brown@company.com  │ Finance    │ $95,000  │
│ [Edit]  │ Charlie Davis│ charlie.davis@company.com│ Engineering│ $110,000 │
└─────────┴──────────────┴──────────────────────────┴────────────┴──────────┘
```

## Still Having Issues?

### Check 1: Verify Functions Exist

Run this query in PostgreSQL:

```sql
SELECT proname 
FROM pg_proc 
WHERE proname LIKE 'sp_grid%';
```

**Expected output:**
```
sp_grid_example_employees
sp_grid_update_example_employees
```

### Check 2: Verify Data Exists

```sql
SELECT COUNT(*) FROM "Employees";
SELECT COUNT(*) FROM "Departments";
SELECT COUNT(*) FROM "StoredProcedureRegistry";
```

**Expected output:**
```
5
6
1
```

### Check 3: Test the Function Directly

```sql
SELECT * FROM sp_Grid_Example_Employees(1, 15, NULL, NULL, NULL, 'ASC', NULL, NULL);
```

**Expected:** JSON response with rows, columns, and totalCount

### Check 4: Verify API Response

After setup, test the API again:

```powershell
Invoke-WebRequest -Uri "http://localhost:5125/api/DynamicGrid/available-procedures" -Method GET | Select-Object -ExpandProperty Content
```

**Expected output:**
```json
[
  {
    "id": 1,
    "procedureName": "sp_Grid_Example_Employees",
    "displayName": "Example Employees",
    "description": "Demo employee grid with department information",
    "category": "HR",
    "isActive": true,
    "requiresAuth": true,
    "allowedRoles": ["Admin", "Manager", "User"],
    "defaultPageSize": 15,
    "maxPageSize": 1000
  }
]
```

## Summary

**Root Cause:** PostgreSQL functions and seed data not created yet

**Solution:** Run `complete-setup.sql` script in PostgreSQL

**Time Required:** 2-3 minutes

**Next Steps After Setup:**
1. Refresh browser
2. Select "Example Employees (HR)" from dropdown
3. Click Refresh button
4. Grid should load with 5 employees
5. Click Edit button to test row-level editing
6. Make changes and click Save
