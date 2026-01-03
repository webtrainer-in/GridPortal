-- =============================================
-- PostgreSQL Function: sp_Grid_Update_Example_Employees
-- Description: Row-level update function for employee data
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Update_Example_Employees(
    p_Id INT,
    p_ChangesJson TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Success BOOLEAN := false;
    v_Message TEXT := '';
    v_FullName TEXT;
    v_FirstName TEXT;
    v_LastName TEXT;
    v_Email TEXT;
    v_Phone TEXT;
    v_Department TEXT;
    v_DepartmentId INT;
    v_Salary DECIMAL;
    v_JoinDate DATE;
    v_Status TEXT;
    v_Location TEXT;
    v_PerformanceRating DECIMAL;
    v_YearsExperience INT;
    v_ReportingManager TEXT;
    v_UpdateCount INT := 0;
BEGIN
    -- Parse JSON changes
    v_FullName := (p_ChangesJson::jsonb)->>'FullName';
    v_Email := (p_ChangesJson::jsonb)->>'Email';
    v_Phone := (p_ChangesJson::jsonb)->>'Phone';
    v_Department := (p_ChangesJson::jsonb)->>'Department';
    v_Salary := ((p_ChangesJson::jsonb)->>'Salary')::DECIMAL;
    v_JoinDate := ((p_ChangesJson::jsonb)->>'JoinDate')::DATE;
    v_Status := (p_ChangesJson::jsonb)->>'Status';
    v_Location := (p_ChangesJson::jsonb)->>'Location';
    v_PerformanceRating := ((p_ChangesJson::jsonb)->>'PerformanceRating')::DECIMAL;
    v_YearsExperience := ((p_ChangesJson::jsonb)->>'YearsExperience')::INT;
    v_ReportingManager := (p_ChangesJson::jsonb)->>'ReportingManager';
    
    -- Validate FullName and split if provided
    IF v_FullName IS NOT NULL THEN
        v_FirstName := SPLIT_PART(v_FullName, ' ', 1);
        v_LastName := SUBSTRING(v_FullName FROM POSITION(' ' IN v_FullName) + 1);
        IF v_FirstName = '' OR v_LastName = '' THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Full name must contain first and last name separated by space'
            );
        END IF;
    END IF;
    
    -- Validate Email if provided
    IF v_Email IS NOT NULL AND v_Email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid email format'
        );
    END IF;
    
    -- Check if email already exists (for different employee)
    IF v_Email IS NOT NULL AND EXISTS (
        SELECT 1 FROM "Employees" WHERE "Email" = v_Email AND "Id" != p_Id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email already in use'
        );
    END IF;
    
    -- Validate Salary if provided
    IF v_Salary IS NOT NULL AND (v_Salary < 0 OR v_Salary > 10000000) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Salary must be between 0 and 10,000,000'
        );
    END IF;
    
    -- Validate Status if provided
    IF v_Status IS NOT NULL AND v_Status NOT IN ('Active', 'Inactive', 'On Leave') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid status value. Must be Active, Inactive, or On Leave'
        );
    END IF;
    
    -- Validate Performance Rating if provided
    IF v_PerformanceRating IS NOT NULL AND (v_PerformanceRating < 0 OR v_PerformanceRating > 5) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Performance rating must be between 0 and 5'
        );
    END IF;
    
    -- Get Department ID if department name provided
    IF v_Department IS NOT NULL THEN
        SELECT "Id" INTO v_DepartmentId FROM "Departments" WHERE "Name" = v_Department;
        IF v_DepartmentId IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Department not found: ' || v_Department
            );
        END IF;
    END IF;
    
    -- Perform update
    UPDATE "Employees"
    SET 
        "FirstName" = COALESCE(v_FirstName, "FirstName"),
        "LastName" = COALESCE(v_LastName, "LastName"),
        "Email" = COALESCE(v_Email, "Email"),
        "Phone" = COALESCE(v_Phone, "Phone"),
        "DepartmentId" = COALESCE(v_DepartmentId, "DepartmentId"),
        "Salary" = COALESCE(v_Salary, "Salary"),
        "JoinDate" = COALESCE(v_JoinDate, "JoinDate"),
        "Status" = COALESCE(v_Status, "Status"),
        "Location" = COALESCE(v_Location, "Location"),
        "PerformanceRating" = COALESCE(v_PerformanceRating, "PerformanceRating"),
        "YearsExperience" = COALESCE(v_YearsExperience, "YearsExperience"),
        "ReportingManager" = COALESCE(v_ReportingManager, "ReportingManager"),
        "UpdatedAt" = NOW(),
        "UpdatedBy" = p_UserId
    WHERE "Id" = p_Id;
    
    GET DIAGNOSTICS v_UpdateCount = ROW_COUNT;
    
    IF v_UpdateCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Employee not found with ID: ' || p_Id
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Employee updated successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
