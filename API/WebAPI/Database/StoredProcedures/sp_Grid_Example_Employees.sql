-- =============================================
-- PostgreSQL Function: sp_Grid_Example_Employees
-- Description: Dynamic grid function for employee data
-- Returns: Single JSONB object with rows, columns, and totalCount
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
