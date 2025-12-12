-- =============================================
-- Complete setup for Delete Employee functionality
-- Run this script in pgAdmin or your PostgreSQL client
-- =============================================

-- Step 1: Create the delete stored procedure
CREATE OR REPLACE FUNCTION sp_Grid_Delete_Employee(
    p_EmployeeId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Result JSONB;
    v_RowsAffected INT;
BEGIN
    -- Validate input
    IF p_EmployeeId IS NULL OR p_EmployeeId <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid employee ID',
            'errorCode', 'INVALID_ID'
        );
    END IF;
    
    -- Check if employee exists
    IF NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Id" = p_EmployeeId) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Employee not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    -- Delete the employee
    DELETE FROM "Employees" WHERE "Id" = p_EmployeeId;
    
    GET DIAGNOSTICS v_RowsAffected = ROW_COUNT;
    
    -- Return success response
    IF v_RowsAffected > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Employee deleted successfully',
            'rowsAffected', v_RowsAffected
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to delete employee',
            'errorCode', 'DELETE_FAILED'
        );
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete employee: referenced by other records',
            'errorCode', 'FOREIGN_KEY_VIOLATION'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error deleting employee: ' || SQLERRM,
            'errorCode', 'DATABASE_ERROR'
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sp_Grid_Delete_Employee(INT) TO PUBLIC;

-- Step 2: Register the procedure in StoredProcedureRegistry
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName",
    "DisplayName",
    "Description",
    "Category",
    "IsActive",
    "RequiresAuth",
    "AllowedRoles",
    "DefaultPageSize",
    "MaxPageSize",
    "CreatedAt",
    "UpdatedAt"
)
VALUES (
    'sp_Grid_Delete_Employee',
    'Delete Employee',
    'Delete an employee record from the grid',
    'Employee Management',
    true,
    true,
    '["Admin", "Manager", "User"]'::jsonb,  -- Added "User" role
    15,
    1000,
    NOW(),
    NOW()
)
ON CONFLICT ("ProcedureName") DO UPDATE SET
    "IsActive" = true,
    "AllowedRoles" = '["Admin", "Manager", "User"]'::jsonb,  -- Update to include "User"
    "UpdatedAt" = NOW();

-- Step 3: Verify the registration
SELECT "ProcedureName", "DisplayName", "AllowedRoles", "IsActive" 
FROM "StoredProcedureRegistry" 
WHERE "ProcedureName" = 'sp_Grid_Delete_Employee';
