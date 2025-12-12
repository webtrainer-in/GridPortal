-- =============================================
-- Register Update Procedure
-- Description: Add sp_Grid_Update_Example_Employees to registry
-- =============================================

INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Description", "Category", "IsActive", 
    "RequiresAuth", "AllowedRoles", "DefaultPageSize", "MaxPageSize", "CreatedAt"
)
VALUES (
    'sp_Grid_Update_Example_Employees',
    'Update Example Employees',
    'Update procedure for employee grid',
    'HR',
    true,
    true,
    '["Admin", "Manager", "User"]',
    15,
    1000,
    NOW()
)
ON CONFLICT ("ProcedureName") DO NOTHING;

-- Verify registration
SELECT "ProcedureName", "DisplayName", "IsActive" 
FROM "StoredProcedureRegistry" 
WHERE "ProcedureName" LIKE '%Example_Employees%'
ORDER BY "ProcedureName";
