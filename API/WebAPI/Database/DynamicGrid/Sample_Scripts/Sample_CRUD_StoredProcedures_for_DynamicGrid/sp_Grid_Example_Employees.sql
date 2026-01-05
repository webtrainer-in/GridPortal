-- =============================================
-- Updated sp_Grid_Employee with Dropdown Support
-- This version loads dropdown configuration from ColumnMetadata
-- and merges it with the existing column definitions
-- =============================================

CREATE OR REPLACE FUNCTION public.sp_grid_employee(
	p_pagenumber integer DEFAULT 1,
	p_pagesize integer DEFAULT 15,
	p_startrow integer DEFAULT NULL::integer,
	p_endrow integer DEFAULT NULL::integer,
	p_sortcolumn character varying DEFAULT NULL::character varying,
	p_sortdirection character varying DEFAULT 'ASC'::character varying,
	p_filterjson text DEFAULT NULL::text,
	p_searchterm character varying DEFAULT NULL::character varying)
    RETURNS jsonb
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_Offset INT;
    v_FetchSize INT;
    v_Data JSONB;
    v_Columns JSONB;
    v_BaseColumns JSONB;
    v_DropdownConfigs JSONB;
    v_TotalCount INT;
    v_FilterWhere TEXT := '';
    v_FilterJson JSONB;
    v_FilterKeys TEXT[];
    v_FilterKey TEXT;
    v_FilterValue JSONB;
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
    IF v_FetchSize < 1 THEN v_FetchSize := 100; END IF;
    IF p_SortDirection NOT IN ('ASC', 'DESC') THEN p_SortDirection := 'ASC'; END IF;
    
    -- Build filter WHERE clause from JSON
    IF p_FilterJson IS NOT NULL AND p_FilterJson != '' THEN
        v_FilterJson := p_FilterJson::JSONB;
        v_FilterKeys := ARRAY(SELECT jsonb_object_keys(v_FilterJson));
        
        FOREACH v_FilterKey IN ARRAY v_FilterKeys LOOP
            v_FilterValue := v_FilterJson -> v_FilterKey;
            
            -- Handle 'set' filter (multi-select)
            IF v_FilterValue ->> 'filterType' = 'set' THEN
                DECLARE
                    v_Values TEXT[];
                    v_Value TEXT;
                    v_ValueConditions TEXT := '';
                BEGIN
                    v_Values := ARRAY(SELECT jsonb_array_elements_text(v_FilterValue -> 'values'));
                    
                    FOREACH v_Value IN ARRAY v_Values LOOP
                        IF v_ValueConditions != '' THEN
                            v_ValueConditions := v_ValueConditions || ' OR ';
                        END IF;
                        
                        CASE v_FilterKey
                            WHEN 'Department' THEN
                                v_ValueConditions := v_ValueConditions || format('d."Name" = %L', v_Value);
                            WHEN 'Status' THEN
                                v_ValueConditions := v_ValueConditions || format('e."Status" = %L', v_Value);
                            WHEN 'Location' THEN
                                v_ValueConditions := v_ValueConditions || format('e."Location" = %L', v_Value);
                            WHEN 'FullName' THEN
                                v_ValueConditions := v_ValueConditions || format('(e."FirstName" || '' '' || e."LastName") ILIKE %L', '%' || v_Value || '%');
                            ELSE
                                v_ValueConditions := v_ValueConditions || format('e.%I = %L', v_FilterKey, v_Value);
                        END CASE;
                    END LOOP;
                    
                    IF v_ValueConditions != '' THEN
                        IF v_FilterWhere != '' THEN
                            v_FilterWhere := v_FilterWhere || ' AND ';
                        END IF;
                        v_FilterWhere := v_FilterWhere || '(' || v_ValueConditions || ')';
                    END IF;
                END;
            END IF;
            
            -- Handle 'text' filter
            IF v_FilterValue ->> 'filterType' = 'text' THEN
                DECLARE
                    v_FilterText TEXT := v_FilterValue ->> 'filter';
                    v_FilterType TEXT := v_FilterValue ->> 'type';
                    v_Condition TEXT;
                BEGIN
                    IF v_FilterWhere != '' THEN
                        v_FilterWhere := v_FilterWhere || ' AND ';
                    END IF;
                    
                    IF v_FilterKey = 'FullName' THEN
                        CASE v_FilterType
                            WHEN 'contains' THEN
                                v_Condition := format('(e."FirstName" || '' '' || e."LastName") ILIKE %L', '%' || v_FilterText || '%');
                            WHEN 'equals' THEN
                                v_Condition := format('(e."FirstName" || '' '' || e."LastName") = %L', v_FilterText);
                            WHEN 'startsWith' THEN
                                v_Condition := format('(e."FirstName" || '' '' || e."LastName") ILIKE %L', v_FilterText || '%');
                            WHEN 'endsWith' THEN
                                v_Condition := format('(e."FirstName" || '' '' || e."LastName") ILIKE %L', '%' || v_FilterText);
                            ELSE
                                v_Condition := format('(e."FirstName" || '' '' || e."LastName") ILIKE %L', '%' || v_FilterText || '%');
                        END CASE;
                    ELSE
                        CASE v_FilterType
                            WHEN 'contains' THEN
                                v_Condition := format('e.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                            WHEN 'equals' THEN
                                v_Condition := format('e.%I = %L', v_FilterKey, v_FilterText);
                            WHEN 'startsWith' THEN
                                v_Condition := format('e.%I ILIKE %L', v_FilterKey, v_FilterText || '%');
                            WHEN 'endsWith' THEN
                                v_Condition := format('e.%I ILIKE %L', v_FilterKey, '%' || v_FilterText);
                            ELSE
                                v_Condition := format('e.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                        END CASE;
                    END IF;
                    
                    v_FilterWhere := v_FilterWhere || v_Condition;
                END;
            END IF;
        END LOOP;
    END IF;
    
    -- Get total count with filters
    EXECUTE format('
        SELECT COUNT(*) 
        FROM "Employees" e
        LEFT JOIN "Departments" d ON e."DepartmentId" = d."Id"
        WHERE (1=1)
            AND ($1 IS NULL OR 
                 e."FirstName" ILIKE ''%%'' || $1 || ''%%'' OR 
                 e."LastName" ILIKE ''%%'' || $1 || ''%%'' OR
                 e."Email" ILIKE ''%%'' || $1 || ''%%'' OR
                 e."Phone" ILIKE ''%%'' || $1 || ''%%'' OR
                 d."Name" ILIKE ''%%'' || $1 || ''%%'' OR
                 e."Location" ILIKE ''%%'' || $1 || ''%%'' OR
                 e."Status" ILIKE ''%%'' || $1 || ''%%'' OR
                 e."ReportingManager" ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(e."Salary" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(e."YearsExperience" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(e."PerformanceRating" AS TEXT) ILIKE ''%%'' || $1 || ''%%'')
            %s',
        CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END
    ) INTO v_TotalCount USING p_SearchTerm;
    
    -- Get data rows with filters
    EXECUTE format('
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT 
                e."Id",
                e."FirstName" || '' '' || e."LastName" AS "FullName",
                e."Email",
                e."Phone",
                d."Name" AS "Department",
                e."DepartmentId",
                e."GroupId",
                e."Salary",
                TO_CHAR(e."JoinDate", ''YYYY-MM-DD'') AS "JoinDate",
                e."Status",
                e."Location",
                e."PerformanceRating",
                e."YearsExperience",
                e."ReportingManager"
            FROM "Employees" e
            LEFT JOIN "Departments" d ON e."DepartmentId" = d."Id"
            WHERE (1=1)
                AND ($1 IS NULL OR 
                     e."FirstName" ILIKE ''%%'' || $1 || ''%%'' OR 
                     e."LastName" ILIKE ''%%'' || $1 || ''%%'' OR
                     e."Email" ILIKE ''%%'' || $1 || ''%%'' OR
                     e."Phone" ILIKE ''%%'' || $1 || ''%%'' OR
                     d."Name" ILIKE ''%%'' || $1 || ''%%'' OR
                     e."Location" ILIKE ''%%'' || $1 || ''%%'' OR
                     e."Status" ILIKE ''%%'' || $1 || ''%%'' OR
                     e."ReportingManager" ILIKE ''%%'' || $1 || ''%%'' OR
                     CAST(e."Salary" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                     CAST(e."YearsExperience" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                     CAST(e."PerformanceRating" AS TEXT) ILIKE ''%%'' || $1 || ''%%'')
                %s
            ORDER BY 
                CASE WHEN $2 = ''FullName'' AND $3 = ''ASC'' THEN e."FirstName" END ASC,
                CASE WHEN $2 = ''FullName'' AND $3 = ''DESC'' THEN e."FirstName" END DESC,
                CASE WHEN $2 = ''Email'' AND $3 = ''ASC'' THEN e."Email" END ASC,
                CASE WHEN $2 = ''Email'' AND $3 = ''DESC'' THEN e."Email" END DESC,
                CASE WHEN $2 = ''Department'' AND $3 = ''ASC'' THEN d."Name" END ASC,
                CASE WHEN $2 = ''Department'' AND $3 = ''DESC'' THEN d."Name" END DESC,
                CASE WHEN $2 = ''Salary'' AND $3 = ''ASC'' THEN e."Salary" END ASC,
                CASE WHEN $2 = ''Salary'' AND $3 = ''DESC'' THEN e."Salary" END DESC,
                e."Id"
            OFFSET $4
            LIMIT $5
        ) t',
        CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END
    ) INTO v_Data USING p_SearchTerm, p_SortColumn, p_SortDirection, v_Offset, v_FetchSize;
    
    -- Get base column definitions (existing hardcoded columns)
    SELECT jsonb_agg(row_to_json(c)) INTO v_BaseColumns
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
        SELECT 'DepartmentId', 'Department', 'number', 150, true, true, true, 'dropdown', NULL, 'Employment', NULL, false
        UNION ALL
        SELECT 'GroupId', 'Group', 'number', 150, true, true, true, 'dropdown', NULL, 'Employment', NULL, false
        UNION ALL
        SELECT 'Salary', 'Salary', 'number', 120, true, true, true, 'agNumberCellEditor', '{"min":0,"max":1000000,"precision":2}', 'Employment', 'open', false
        UNION ALL
        SELECT 'JoinDate', 'Join Date', 'date', 130, true, true, true, 'agDateCellEditor', NULL, 'Employment', 'open', false
        UNION ALL
        SELECT 'Status', 'Status', 'string', 100, true, true, true, 'dropdown', NULL, 'Employment', 'closed', false
        UNION ALL
        SELECT 'Location', 'Location', 'string', 150, true, true, true, 'agTextCellEditor', NULL, 'Details', 'open', false
        UNION ALL
        SELECT 'PerformanceRating', 'Rating', 'number', 100, true, true, true, 'agNumberCellEditor', '{"min":0,"max":5,"precision":2}', 'Performance', NULL, false
        UNION ALL
        SELECT 'YearsExperience', 'Experience', 'number', 120, true, true, false, NULL, NULL, 'Performance', 'open', false
        UNION ALL
        SELECT 'ReportingManager', 'Manager', 'string', 150, true, true, true, 'agTextCellEditor', NULL, 'Details', 'open', false
    ) c;
    
    -- Get dropdown configurations from ColumnMetadata
    SELECT jsonb_object_agg(
        cm."ColumnName",
        jsonb_build_object(
            'type', cm."DropdownType",
            'staticValues', CASE 
                WHEN cm."StaticValuesJson" IS NOT NULL 
                THEN cm."StaticValuesJson"::jsonb 
                ELSE NULL 
            END,
            'masterTable', cm."MasterTable",
            'valueField', cm."ValueField",
            'labelField', cm."LabelField",
            'filterCondition', cm."FilterCondition",
            'dependsOn', CASE 
                WHEN cm."DependsOnJson" IS NOT NULL 
                THEN cm."DependsOnJson"::jsonb 
                ELSE NULL 
            END
        )
    )
    INTO v_DropdownConfigs
    FROM "ColumnMetadata" cm
    WHERE cm."ProcedureName" = 'sp_Grid_Employee'
      AND cm."IsActive" = true
      AND cm."CellEditor" = 'dropdown';
    
    -- Merge dropdown configs into base columns
    SELECT jsonb_agg(
        CASE 
            WHEN v_DropdownConfigs ? (col->>'field') THEN
                col || jsonb_build_object('dropdownConfig', v_DropdownConfigs->(col->>'field'))
            ELSE
                col
        END
    )
    INTO v_Columns
    FROM jsonb_array_elements(v_BaseColumns) AS col;
    
    -- Return combined JSON response
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::jsonb),
        'columns', COALESCE(v_Columns, '[]'::jsonb),
        'totalCount', v_TotalCount
    );
END;
$BODY$;

ALTER FUNCTION public.sp_grid_employee(integer, integer, integer, integer, character varying, character varying, text, character varying)
    OWNER TO postgres;
