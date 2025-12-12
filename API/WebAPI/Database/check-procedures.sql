-- Quick check to see if update procedure is registered
-- Run this in your PostgreSQL client (pgAdmin, DBeaver, etc.)

SELECT 
    "ProcedureName", 
    "DisplayName", 
    "IsActive",
    "AllowedRoles"
FROM "StoredProcedureRegistry" 
WHERE "ProcedureName" LIKE '%Example_Employees%'
ORDER BY "ProcedureName";

-- Expected output should show BOTH:
-- 1. sp_Grid_Example_Employees
-- 2. sp_Grid_Update_Example_Employees

-- If you only see #1, then run the register-update-procedure.sql script
