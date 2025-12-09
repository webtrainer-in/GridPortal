-- =============================================
-- Complete Database Setup Script
-- Run this entire script in your PostgreSQL client (pgAdmin, DBeaver, etc.)
-- =============================================

-- Step 1: Create sp_Grid_Example_Employees Function
-- =============================================

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
    -- Determine offset and fetch size
    IF p_StartRow IS NOT NULL AND p_EndRow IS NOT NULL THEN
        v_Offset := p_StartRow;
        v_FetchSize := p_EndRow - p_StartRow;
    ELSE
        v_Offset := (p_PageNumber - 1) * p_PageSize;
        v_FetchSize := p_PageSize;
    END IF;
    
    -- Validate inputs
    IF v_FetchSize > 1000 THEN v_FetchSize := 1000; END IF;
    IF v_FetchSize < 1 THEN v_FetchSize := 100; END IF;
    IF p_SortDirection NOT IN ('ASC', 'DESC') THEN p_SortDirection := 'ASC'; END IF;
    
    -- Get total count
    SELECT COUNT(*) INTO v_TotalCount
    FROM "Employees" e
    INNER JOIN "Departments" d ON e."DepartmentId" = d."Id"
    WHERE (p_SearchTerm IS NULL OR 
           e."FirstName" ILIKE '%' || p_SearchTerm || '%' OR 
           e."LastName" ILIKE '%' || p_SearchTerm || '%' OR
           e."Email" ILIKE '%' || p_SearchTerm || '%');
    
    -- Get data rows
    SELECT jsonb_agg(row_to_json(t)) INTO v_Data
    FROM (
        SELECT 
            e."Id",
            e."FirstName" || ' ' || e."LastName" AS "FullName",
            e."Email",
            e."Phone",
            d."Name" AS "Department",
            e."Salary",
            TO_CHAR(e."JoinDate", 'YYYY-MM-DD') AS "JoinDate",
            e."Status",
            e."Location",
            e."PerformanceRating",
            e."YearsExperience",
            e."ReportingManager"
        FROM "Employees" e
        INNER JOIN "Departments" d ON e."DepartmentId" = d."Id"
        WHERE (p_SearchTerm IS NULL OR 
               e."FirstName" ILIKE '%' || p_SearchTerm || '%' OR 
               e."LastName" ILIKE '%' || p_SearchTerm || '%' OR
               e."Email" ILIKE '%' || p_SearchTerm || '%')
        ORDER BY 
            CASE WHEN p_SortColumn = 'FullName' AND p_SortDirection = 'ASC' THEN e."FirstName" END ASC,
            CASE WHEN p_SortColumn = 'FullName' AND p_SortDirection = 'DESC' THEN e."FirstName" END DESC,
            CASE WHEN p_SortColumn = 'Email' AND p_SortDirection = 'ASC' THEN e."Email" END ASC,
            CASE WHEN p_SortColumn = 'Email' AND p_SortDirection = 'DESC' THEN e."Email" END DESC,
            CASE WHEN p_SortColumn = 'Department' AND p_SortDirection = 'ASC' THEN d."Name" END ASC,
            CASE WHEN p_SortColumn = 'Department' AND p_SortDirection = 'DESC' THEN d."Name" END DESC,
            CASE WHEN p_SortColumn = 'Salary' AND p_SortDirection = 'ASC' THEN e."Salary" END ASC,
            CASE WHEN p_SortColumn = 'Salary' AND p_SortDirection = 'DESC' THEN e."Salary" END DESC,
            e."Id"
        OFFSET v_Offset
        LIMIT v_FetchSize
    ) t;
    
    -- Get column definitions
    SELECT jsonb_agg(row_to_json(c)) INTO v_Columns
    FROM (
        SELECT 'actions' AS field, 'Actions' AS "headerName", 'actions' AS type, 120 AS width, 
               false AS sortable, false AS filter, false AS editable, NULL::text AS "cellEditor", 
               NULL::text AS "cellEditorParams", NULL::text AS "columnGroup", NULL::text AS "columnGroupShow", true AS pinned
        UNION ALL
        SELECT 'Id', 'ID', 'number', 70, true, true, false, NULL, NULL, NULL, NULL, false
        UNION ALL
        SELECT 'FullName', 'Full Name', 'string', 200, true, true, true, 'agTextCellEditor', NULL, 'Personal Info', NULL, false
        UNION ALL
        SELECT 'Email', 'Email', 'string', 250, true, true, true, 'agTextCellEditor', NULL, 'Personal Info', 'open', false
        UNION ALL
        SELECT 'Phone', 'Phone', 'string', 140, true, true, true, 'agTextCellEditor', NULL, 'Personal Info', 'open', false
        UNION ALL
        SELECT 'Department', 'Department', 'string', 150, true, true, false, NULL, NULL, 'Employment', NULL, false
        UNION ALL
        SELECT 'Salary', 'Salary', 'number', 120, true, true, true, 'agNumberCellEditor', '{"min":0,"max":1000000,"precision":2}', 'Employment', 'open', false
        UNION ALL
        SELECT 'JoinDate', 'Join Date', 'date', 130, true, true, true, 'agDateCellEditor', NULL, 'Employment', 'open', false
        UNION ALL
        SELECT 'Status', 'Status', 'string', 100, true, true, true, 'agSelectCellEditor', '{"values":["Active","Inactive","On Leave"]}', 'Employment', 'closed', false
        UNION ALL
        SELECT 'Location', 'Location', 'string', 150, true, true, true, 'agTextCellEditor', NULL, 'Details', 'open', false
        UNION ALL
        SELECT 'PerformanceRating', 'Rating', 'number', 100, true, true, true, 'agNumberCellEditor', '{"min":0,"max":5,"precision":2}', 'Performance', NULL, false
        UNION ALL
        SELECT 'YearsExperience', 'Experience', 'number', 120, true, true, false, NULL, NULL, 'Performance', 'open', false
        UNION ALL
        SELECT 'ReportingManager', 'Manager', 'string', 150, true, true, true, 'agTextCellEditor', NULL, 'Details', 'open', false
    ) c;
    
    -- Return combined JSON response
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::jsonb),
        'columns', COALESCE(v_Columns, '[]'::jsonb),
        'totalCount', v_TotalCount
    );
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create sp_Grid_Update_Example_Employees Function
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

-- Step 3: Seed Departments
-- =============================================

INSERT INTO "Departments" ("Name", "Description", "IsActive", "CreatedAt")
VALUES 
    ('IT', 'Information Technology', true, NOW()),
    ('HR', 'Human Resources', true, NOW()),
    ('Sales', 'Sales and Marketing', true, NOW()),
    ('Finance', 'Finance and Accounting', true, NOW()),
    ('Engineering', 'Engineering and Development', true, NOW()),
    ('Operations', 'Operations and Logistics', true, NOW())
ON CONFLICT DO NOTHING;

-- Step 4: Seed Employees
-- =============================================

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'John', 'Smith', 'john.smith@company.com', '+1-555-0101',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'IT'), 85000.00,
    '2020-01-15'::date, 'Active', 'New York', 4.5, 5, 'Sarah Johnson', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'john.smith@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Jane', 'Doe', 'jane.doe@company.com', '+1-555-0102',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'HR'), 75000.00,
    '2019-03-20'::date, 'Active', 'Los Angeles', 4.8, 6, 'Michael Brown', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'jane.doe@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Bob', 'Wilson', 'bob.wilson@company.com', '+1-555-0103',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Sales'), 90000.00,
    '2018-07-10'::date, 'Active', 'Chicago', 4.2, 7, 'Lisa Anderson', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'bob.wilson@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Alice', 'Brown', 'alice.brown@company.com', '+1-555-0104',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Finance'), 95000.00,
    '2017-11-05'::date, 'Active', 'Boston', 4.7, 8, 'David Miller', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'alice.brown@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Charlie', 'Davis', 'charlie.davis@company.com', '+1-555-0105',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Engineering'), 110000.00,
    '2021-02-28'::date, 'Active', 'San Francisco', 4.9, 4, 'Emily White', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'charlie.davis@company.com');

-- Step 5: Register Stored Procedure
-- =============================================

INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Description", "Category", "IsActive", 
    "RequiresAuth", "AllowedRoles", "DefaultPageSize", "MaxPageSize", "CreatedAt"
)
VALUES (
    'sp_Grid_Example_Employees',
    'Example Employees',
    'Demo employee grid with department information',
    'HR',
    true,
    true,
    '["Admin", "Manager", "User"]',
    15,
    1000,
    NOW()
)
ON CONFLICT ("ProcedureName") DO NOTHING;

-- Step 6: Verify Setup
-- =============================================

-- Test the function
SELECT * FROM sp_Grid_Example_Employees(1, 15, NULL, NULL, NULL, 'ASC', NULL, NULL);

-- Check counts
SELECT 'Departments' AS table_name, COUNT(*) AS count FROM "Departments"
UNION ALL
SELECT 'Employees', COUNT(*) FROM "Employees"
UNION ALL
SELECT 'StoredProcedureRegistry', COUNT(*) FROM "StoredProcedureRegistry";
