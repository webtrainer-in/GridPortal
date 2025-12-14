-- =============================================
-- Update Database Names for Existing Procedures
-- Purpose: Assign database identifiers to existing procedures
-- =============================================

-- PowerSystem Database - Bus-related procedures
UPDATE "StoredProcedureRegistry"
SET "DatabaseName" = 'PowerSystem'
WHERE "ProcedureName" IN (
    'sp_Grid_Buses',
    'sp_Grid_Delete_Bus',
    'sp_Grid_Update_Bus'
);

-- HR Database - Employee-related procedures
UPDATE "StoredProcedureRegistry"
SET "DatabaseName" = 'HR'
WHERE "ProcedureName" IN (
    'sp_Grid_Example_Employees',
    'sp_Grid_Employees',
    'sp_Grid_Delete_Employee',
    'sp_Grid_Update_Employee',
    'sp_Grid_Update_Example_Employees'
);

-- Verify updates
SELECT 
    "ProcedureName",
    "DatabaseName",
    "Category",
    "IsActive"
FROM "StoredProcedureRegistry"
ORDER BY "DatabaseName", "ProcedureName";
