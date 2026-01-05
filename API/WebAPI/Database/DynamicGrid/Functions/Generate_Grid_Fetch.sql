-- =============================================
-- Enhanced Grid Fetch Procedure Generator
-- =============================================
-- Automatically detects correct column name casing from database schema
-- to prevent case sensitivity errors in PostgreSQL
--
-- Usage Example:
--   SELECT generate_grid_fetch_procedure(
--       'Acline',                                          -- table name
--       'Bus_Aclines',                                     -- entity name for procedure
--       ARRAY['ckt', 'ibus', 'jbus', 'CaseNumber'],       -- primary key columns (case-insensitive)
--       ARRAY['ckt', 'ibus', 'jbus', 'CaseNumber', 'name', 'rpu', 'xpu', 'bpu']  -- display columns (case-insensitive)
--   );
-- =============================================

CREATE OR REPLACE FUNCTION Generate_Grid_Fetch(
    p_table_name TEXT,           -- Actual table name (e.g., 'Acline')
    p_entity_name TEXT,          -- Entity name for procedure (e.g., 'Bus_Aclines')
    p_primary_key_cols TEXT[],   -- Array of primary key column names (case-insensitive)
    p_display_cols TEXT[]        -- Array of columns to display in grid (case-insensitive)
)
RETURNS TEXT AS $$
DECLARE
    v_proc_name TEXT;
    v_id_construction TEXT := '';
    v_select_fields TEXT := '';
    v_column_defs TEXT := '';
    v_col TEXT;
    v_actual_col_name TEXT;
    v_idx INT := 1;
    v_needs_quotes BOOLEAN;
    -- Search-related variables
    v_search_conditions TEXT := '';
    v_search_col_name TEXT;
    v_search_needs_quotes BOOLEAN;
    v_search_count INT := 0;
    -- AG Grid filter-related variables
    v_filter_json JSONB;
    v_filter_keys TEXT[];
    v_filter_key TEXT;
    v_filter_value JSONB;
    v_filter_type TEXT;
    v_condition TEXT;
    v_filter_text TEXT;
    v_filter_number NUMERIC;
    v_col_type TEXT;
    v_ag_grid_type TEXT;
    -- Template-related variables
    v_filter_parser_template TEXT;
    v_column_type_map TEXT := '';
BEGIN
    v_proc_name := 'sp_Grid_' || p_entity_name;
    
    -- Build ID construction (concatenate all PK columns with correct case)
    v_id_construction := '(';
    FOREACH v_col IN ARRAY p_primary_key_cols LOOP
        -- Get actual column name with correct case from database
        SELECT 
            column_name,
            column_name != lower(column_name)  -- Check if needs quotes
        INTO v_actual_col_name, v_needs_quotes
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        IF v_actual_col_name IS NULL THEN
            RAISE EXCEPTION 'Column % not found in table %', v_col, p_table_name;
        END IF;
        
        IF v_idx > 1 THEN
            v_id_construction := v_id_construction || ' || ''''_'''' || ';
        END IF;
        
        -- Add quotes if column has mixed case
        IF v_needs_quotes THEN
            v_id_construction := v_id_construction || 'a."' || v_actual_col_name || '"::TEXT';
        ELSE
            v_id_construction := v_id_construction || 'a.' || v_actual_col_name || '::TEXT';
        END IF;
        
        v_idx := v_idx + 1;
    END LOOP;
    v_id_construction := v_id_construction || ') AS "Id"';
    
    -- Build SELECT fields with correct case
    FOREACH v_col IN ARRAY p_display_cols LOOP
        -- Get actual column name with correct case
        SELECT 
            column_name,
            column_name != lower(column_name)
        INTO v_actual_col_name, v_needs_quotes
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        IF v_actual_col_name IS NULL THEN
            RAISE WARNING 'Column % not found in table %, skipping', v_col, p_table_name;
            CONTINUE;
        END IF;
        
        -- Add quotes if needed
        IF v_needs_quotes THEN
            v_select_fields := v_select_fields || format('            a."%s",%s', v_actual_col_name, E'\n');
        ELSE
            v_select_fields := v_select_fields || format('            a.%s,%s', v_actual_col_name, E'\n');
        END IF;
    END LOOP;
    v_select_fields := rtrim(v_select_fields, ',' || E'\n');
    
    -- Build column definitions (basic - user can customize)
    FOREACH v_col IN ARRAY p_display_cols LOOP
        -- Get actual column name and data type
        SELECT column_name, data_type INTO v_actual_col_name, v_col_type
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        IF v_actual_col_name IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Determine AG Grid column type based on database data type
        IF v_col_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN
            v_ag_grid_type := 'number';
        ELSIF v_col_type IN ('date', 'timestamp without time zone', 'timestamp with time zone') THEN
            v_ag_grid_type := 'date';
        ELSE
            v_ag_grid_type := 'text';
        END IF;
        
        v_column_defs := v_column_defs || format('        {"field": "%s", "headerName": "%s", "type": "%s", "width": 120, "sortable": true, "filter": true, "editable": true, "cellEditor": "agTextCellEditor"},%s',
            v_actual_col_name,
            initcap(replace(v_actual_col_name, '_', ' ')),  -- Convert snake_case to Title Case
            v_ag_grid_type,
            E'\n'
        );
    END LOOP;
    v_column_defs := rtrim(v_column_defs, ',' || E'\n');
    
    -- Get first PK column with correct case for ORDER BY
    SELECT column_name INTO v_actual_col_name
    FROM information_schema.columns
    WHERE table_name = p_table_name
      AND table_schema = 'public'
      AND lower(column_name) = lower(p_primary_key_cols[1])
    LIMIT 1;
    
    -- Check if ORDER BY column needs quotes
    SELECT column_name != lower(column_name) INTO v_needs_quotes
    FROM information_schema.columns
    WHERE table_name = p_table_name
      AND table_schema = 'public'
      AND lower(column_name) = lower(p_primary_key_cols[1])
    LIMIT 1;
    
    -- Build search conditions for p_SearchTerm
    -- Cast all columns to TEXT and use ILIKE (simpler and works for all types)
    FOR v_search_col_name, v_search_needs_quotes IN
        SELECT 
            column_name,
            column_name != lower(column_name)
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = ANY(SELECT lower(unnest(p_display_cols)))
        ORDER BY ordinal_position
    LOOP
        IF v_search_count > 0 THEN
            v_search_conditions := v_search_conditions || ' OR' || E'\n                 ';
        END IF;
        
        -- Cast to TEXT and use ILIKE (works for all data types)
        -- Use 4 percent signs to get %% in the final output
        IF v_search_needs_quotes THEN
            v_search_conditions := v_search_conditions || format('CAST(a."%s" AS TEXT) ILIKE ''''%%%%'''' || $1 || ''''%%%%''''', v_search_col_name);
        ELSE
            v_search_conditions := v_search_conditions || format('CAST(a.%s AS TEXT) ILIKE ''''%%%%'''' || $1 || ''''%%%%''''', v_search_col_name);
        END IF;
        
        v_search_count := v_search_count + 1;
    END LOOP;
    
    -- If no searchable columns found, create a dummy condition
    IF v_search_count = 0 THEN
        v_search_conditions := '1=1';
    END IF;
    
    -- Load AG Grid filter parser template (embedded)
    v_filter_parser_template := $TEMPLATE$
    -- Parse filter JSON if provided
    IF p_FilterJson IS NOT NULL AND p_FilterJson != '' THEN
        v_FilterJson := p_FilterJson::JSONB;
        v_FilterKeys := ARRAY(SELECT jsonb_object_keys(v_FilterJson));

        FOREACH v_FilterKey IN ARRAY v_FilterKeys
        LOOP
            v_FilterValue := v_FilterJson->v_FilterKey;

            -- Check if this is AG Grid filter model format
            IF v_FilterValue ? 'filterType' THEN
                DECLARE
                    v_ColumnType TEXT;
                BEGIN
                    v_FilterType := v_FilterValue->>'type';

                    -- Determine column type from mapping
                    v_ColumnType := CASE v_FilterKey
{{COLUMN_TYPE_MAP}}
                        ELSE 'text'
                    END;

                    -- Handle text filters
                    IF v_ColumnType = 'text' THEN
                        v_FilterText := v_FilterValue->>'filter';
                        CASE v_FilterType
                            WHEN 'contains' THEN
                                v_Condition := format('a.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                            WHEN 'notContains' THEN
                                v_Condition := format('a.%I NOT ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                            WHEN 'equals' THEN
                                v_Condition := format('a.%I ILIKE %L', v_FilterKey, v_FilterText);
                            WHEN 'notEqual' THEN
                                v_Condition := format('a.%I NOT ILIKE %L', v_FilterKey, v_FilterText);
                            WHEN 'startsWith' THEN
                                v_Condition := format('a.%I ILIKE %L', v_FilterKey, v_FilterText || '%');
                            WHEN 'endsWith' THEN
                                v_Condition := format('a.%I ILIKE %L', v_FilterKey, '%' || v_FilterText);
                            WHEN 'blank' THEN
                                v_Condition := format('(a.%I IS NULL OR a.%I = '''')', v_FilterKey, v_FilterKey);
                            WHEN 'notBlank' THEN
                                v_Condition := format('(a.%I IS NOT NULL AND a.%I != '''')', v_FilterKey, v_FilterKey);
                            ELSE
                                v_Condition := format('a.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                        END CASE;
                    
                    -- Handle number filters
                    ELSIF v_ColumnType = 'number' THEN
                        v_FilterNumber := (v_FilterValue->>'filter')::NUMERIC;
                        CASE v_FilterType
                            WHEN 'equals' THEN
                                v_Condition := format('a.%I = %s', v_FilterKey, v_FilterNumber);
                            WHEN 'notEqual' THEN
                                v_Condition := format('a.%I != %s', v_FilterKey, v_FilterNumber);
                            WHEN 'lessThan' THEN
                                v_Condition := format('a.%I < %s', v_FilterKey, v_FilterNumber);
                            WHEN 'lessThanOrEqual' THEN
                                v_Condition := format('a.%I <= %s', v_FilterKey, v_FilterNumber);
                            WHEN 'greaterThan' THEN
                                v_Condition := format('a.%I > %s', v_FilterKey, v_FilterNumber);
                            WHEN 'greaterThanOrEqual' THEN
                                v_Condition := format('a.%I >= %s', v_FilterKey, v_FilterNumber);
                            WHEN 'blank' THEN
                                v_Condition := format('a.%I IS NULL', v_FilterKey);
                            WHEN 'notBlank' THEN
                                v_Condition := format('a.%I IS NOT NULL', v_FilterKey);
                            ELSE
                                v_Condition := format('a.%I = %s', v_FilterKey, v_FilterNumber);
                        END CASE;
                    END IF;

                    -- Add condition to filter WHERE clause
                    IF v_FilterWhere != '' THEN
                        v_FilterWhere := v_FilterWhere || ' AND ';
                    END IF;
                    v_FilterWhere := v_FilterWhere || v_Condition;
                END;
            END IF;
        END LOOP;
    END IF;
$TEMPLATE$;
    
    -- Build column type mapping for the template
    FOR v_search_col_name, v_col_type IN
        SELECT 
            column_name,
            CASE 
                WHEN data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN 'number'
                WHEN data_type = 'boolean' THEN 'boolean'
                WHEN data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone') THEN 'date'
                ELSE 'text'
            END
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = ANY(SELECT lower(unnest(p_display_cols)))
        ORDER BY ordinal_position
    LOOP
        v_column_type_map := v_column_type_map || format('                        WHEN %L THEN %L%s', v_search_col_name, v_col_type, E'\n');
    END LOOP;
    
    -- Replace placeholder in template
    v_filter_parser_template := replace(v_filter_parser_template, '{{COLUMN_TYPE_MAP}}', v_column_type_map);
    
    
    -- Generate the procedure SQL
    RETURN format($PROC$
-- Auto-generated FETCH procedure for %s
-- CUSTOMIZE: Add JOINs, filters, and adjust column definitions as needed
-- NOTE: Column names have been auto-detected with correct casing from database schema
-- ✨ INCLUDES: Generic global search across all text and number columns
CREATE OR REPLACE FUNCTION public.%s(
    p_PageNumber INTEGER DEFAULT 1,
    p_PageSize INTEGER DEFAULT 15,
    p_StartRow INTEGER DEFAULT NULL,
    p_EndRow INTEGER DEFAULT NULL,
    p_SortColumn VARCHAR DEFAULT NULL,
    p_SortDirection VARCHAR DEFAULT 'ASC',
    p_FilterJson TEXT DEFAULT NULL,
    p_SearchTerm VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE 'plpgsql'
AS $INNER$
DECLARE
    v_Offset INT;
    v_FetchSize INT;
    v_Data JSONB;
    v_Columns JSONB;
    v_BaseColumns JSONB;
    v_DropdownConfigs JSONB;
    v_LinkConfigs JSONB;
    v_TotalCount INT;
    v_FilterWhere TEXT := '';
    -- AG Grid filter variables
    v_FilterJson JSONB;
    v_FilterKeys TEXT[];
    v_FilterKey TEXT;
    v_FilterValue JSONB;
    v_FilterType TEXT;
    v_Condition TEXT;
    v_FilterText TEXT;
    v_FilterNumber NUMERIC;
BEGIN
    -- Determine offset and fetch size
    IF p_StartRow IS NOT NULL AND p_EndRow IS NOT NULL THEN
        v_Offset := p_StartRow - 1;
        v_FetchSize := p_EndRow - p_StartRow + 1;
    ELSE
        v_Offset := (p_PageNumber - 1) * p_PageSize;
        v_FetchSize := p_PageSize;
    END IF;
    
%s
    
    -- Get total count with search and filters
    EXECUTE format('
        SELECT COUNT(*)
        FROM "%s" a
        WHERE ($1 IS NULL OR (
            %s
        ))
        ' || (CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END))
    INTO v_TotalCount
    USING p_SearchTerm;
    
    -- Get data rows with search
    EXECUTE format('
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT 
                %s,
%s
            FROM "%s" a
            -- TODO: Add JOIN clauses here
            -- LEFT JOIN "OtherTable" ot ON ot.id = a.other_id
            WHERE ($1 IS NULL OR (
                %s
            ))
            ' || (CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END) || '
            -- TODO: Add JOIN clauses here
            ORDER BY a.%s
            LIMIT $2 OFFSET $3
        ) t')
    INTO v_Data
    USING p_SearchTerm, v_FetchSize, v_Offset;
    
    -- Define base columns
    -- TODO: Customize column types, widths, and editability
    v_BaseColumns := '[
        {"field": "actions", "headerName": "Actions", "width": 120, "sortable": false, "filter": false, "pinned": true},
%s
    ]'::JSONB;
    
    
    -- Get dropdown configurations (if any)
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
    WHERE cm."ProcedureName" = '%s'
      AND cm."IsActive" = true
      AND cm."CellEditor" = 'dropdown';
    
    -- Get link configurations (if any)
    SELECT jsonb_object_agg(
        cm."ColumnName",
        cm."LinkConfig"
    )
    INTO v_LinkConfigs
    FROM "ColumnMetadata" cm
    WHERE cm."ProcedureName" = '%s'
      AND cm."IsActive" = true
      AND cm."LinkConfig" IS NOT NULL
      AND (cm."LinkConfig"->'enabled')::boolean = true;
    
    -- Merge dropdown and link configs into base columns
    SELECT jsonb_agg(
        CASE 
            WHEN v_DropdownConfigs ? (col->>'field') AND v_LinkConfigs ? (col->>'field') THEN
                col || jsonb_build_object('dropdownConfig', v_DropdownConfigs->(col->>'field'))
                    || jsonb_build_object('linkConfig', v_LinkConfigs->(col->>'field'))
            WHEN v_DropdownConfigs ? (col->>'field') THEN
                col || jsonb_build_object('dropdownConfig', v_DropdownConfigs->(col->>'field'))
            WHEN v_LinkConfigs ? (col->>'field') THEN
                col || jsonb_build_object('linkConfig', v_LinkConfigs->(col->>'field'))
            ELSE
                col
        END
    )
    INTO v_Columns
    FROM jsonb_array_elements(v_BaseColumns) AS col;
    
    -- Return result
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::JSONB),
        'columns', COALESCE(v_Columns, '[]'::JSONB),
        'totalCount', v_TotalCount,
        'pageNumber', p_PageNumber,
        'pageSize', p_PageSize,
        'totalPages', CEIL(v_TotalCount::NUMERIC / p_PageSize)
    );
END;
$INNER$;

GRANT EXECUTE ON FUNCTION %s TO PUBLIC;

-- TODO: Customize this procedure by:
-- 1. Adding JOIN clauses for related tables
-- 2. Adding WHERE clauses for filtering
-- 3. Setting correct widths and editability
$PROC$,
        p_table_name,                    -- 1. Entity name (comment)
        v_proc_name,                     -- 2. Function name
        v_filter_parser_template,        -- 3. AG Grid filter parser logic
        p_table_name,                    -- 4. Table name for COUNT
        v_search_conditions,             -- 5. Search conditions for COUNT
        v_id_construction,               -- 6. ID construction
        v_select_fields,                 -- 7. SELECT fields
        p_table_name,                    -- 8. Table name for SELECT
        v_search_conditions,             -- 9. Search conditions for SELECT
        CASE WHEN v_needs_quotes THEN '"' || v_actual_col_name || '"' ELSE v_actual_col_name END,  -- 10. ORDER BY
        v_column_defs,                   -- 11. Column definitions
        v_proc_name,                     -- 12. Dropdown config ProcedureName
        v_proc_name,                     -- 13. Link config ProcedureName
        v_proc_name                      -- 14. GRANT statement
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION Generate_Grid_Fetch TO PUBLIC;

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║     Enhanced Grid Fetch Procedure Generator Ready!          ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  ✨ NEW: Generic global search (p_SearchTerm)                ║';
    RAISE NOTICE '║  ✨ NEW: Dynamic column filters (p_FilterJson)               ║';
    RAISE NOTICE '║  ✨ Auto-detects searchable columns (text + numbers)         ║';
    RAISE NOTICE '║  ✨ Automatically detects correct column casing              ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage Example:';
    RAISE NOTICE '  SELECT Generate_Grid_Fetch(';
    RAISE NOTICE '      ''Adjust'',';
    RAISE NOTICE '      ''Bus_Adjusts'',';
    RAISE NOTICE '      ARRAY[''acctap'', ''casenumber''],  -- Case-insensitive!';
    RAISE NOTICE '      ARRAY[''acctap'', ''casenumber'', ''adjthr'', ''mxswim'']';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Generated procedure includes:';
    RAISE NOTICE '   - Global search across all text and number columns';
    RAISE NOTICE '   - Correct column name casing from database schema';
    RAISE NOTICE '   - Ready-to-customize template with TODO markers';
END $$;
