-- =============================================
-- CRUD Procedure Generator with Full Type Casting
-- =============================================
-- Generates UPDATE and DELETE procedures with proper type handling
-- =============================================

CREATE OR REPLACE FUNCTION Generate_CRUD_Procedures(
    p_table_name TEXT,
    p_entity_name TEXT,
    p_primary_key_cols TEXT[],
    p_editable_cols TEXT[]  -- Used for both INSERT and UPDATE
)
RETURNS TEXT AS $$
DECLARE
    v_insert_proc_name TEXT;
    v_update_proc_name TEXT;
    v_delete_proc_name TEXT;
    v_insert_sql TEXT;
    v_update_sql TEXT;
    v_delete_sql TEXT;
    v_pk_parse TEXT := '';
    v_pk_where TEXT := '';
    v_insert_pk_where TEXT := '';  -- WHERE clause for INSERT (uses v_NewRecord)
    v_update_sets TEXT := '';
    v_declare_vars TEXT := '';
    v_extract_vars TEXT := '';
    -- INSERT-specific variables
    v_insert_cols TEXT := '';
    v_insert_values TEXT := '';
    v_required_checks TEXT := '';
    v_select_cols TEXT := '';
    v_is_nullable TEXT;
    v_has_default TEXT;
    -- Common variables
    v_col TEXT;
    v_pk_col TEXT;
    v_col_type TEXT;
    v_idx INT;
    v_id_format TEXT := '';
BEGIN
    v_insert_proc_name := 'sp_Grid_Insert_' || p_entity_name;
    v_update_proc_name := 'sp_Grid_Update_' || p_entity_name;
    v_delete_proc_name := 'sp_Grid_Delete_' || p_entity_name;
    v_id_format := array_to_string(p_primary_key_cols, '_');
    
    -- =============================================
    -- BUILD INSERT PROCEDURE COMPONENTS
    -- =============================================
    
    -- Build required field checks for NOT NULL columns without defaults
    FOREACH v_col IN ARRAY p_editable_cols LOOP
        SELECT 
            data_type,
            is_nullable,
            CASE WHEN column_default IS NOT NULL THEN 'YES' ELSE 'NO' END
        INTO v_col_type, v_is_nullable, v_has_default
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        -- Add required check for NOT NULL columns without defaults
        IF v_is_nullable = 'NO' AND v_has_default = 'NO' THEN
            v_required_checks := v_required_checks || format($CHK$
    IF NOT (v_FieldValues ? '%s') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '%s is required',
            'errorCode', 'REQUIRED_FIELD_MISSING'
        );
    END IF;
$CHK$, lower(v_col), initcap(replace(v_col, '_', ' ')));
        END IF;
    END LOOP;
    
    -- Build INSERT columns and VALUES with type detection
    FOREACH v_col IN ARRAY p_editable_cols LOOP
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        IF v_insert_cols != '' THEN
            v_insert_cols := v_insert_cols || ',' || E'\n            ';
            v_insert_values := v_insert_values || ',' || E'\n            ';
        END IF;
        
        v_insert_cols := v_insert_cols || format('"%s"', v_col);
        
        -- Cast based on column type with NULL handling
        IF v_col_type IN ('integer', 'bigint', 'smallint') THEN
            v_insert_values := v_insert_values || format(
                'CASE WHEN v_FieldValues ? ''%s'' THEN (v_FieldValues->>''%s'')::INTEGER ELSE NULL END',
                lower(v_col), lower(v_col)
            );
        ELSIF v_col_type IN ('numeric', 'decimal', 'real', 'double precision') THEN
            v_insert_values := v_insert_values || format(
                'CASE WHEN v_FieldValues ? ''%s'' THEN (v_FieldValues->>''%s'')::NUMERIC ELSE NULL END',
                lower(v_col), lower(v_col)
            );
        ELSIF v_col_type = 'boolean' THEN
            v_insert_values := v_insert_values || format(
                'CASE WHEN v_FieldValues ? ''%s'' THEN (v_FieldValues->>''%s'')::BOOLEAN ELSE NULL END',
                lower(v_col), lower(v_col)
            );
        ELSIF v_col_type = 'date' THEN
            v_insert_values := v_insert_values || format(
                'CASE WHEN v_FieldValues ? ''%s'' THEN (v_FieldValues->>''%s'')::DATE ELSE NULL END',
                lower(v_col), lower(v_col)
            );
        ELSIF v_col_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
            v_insert_values := v_insert_values || format(
                'CASE WHEN v_FieldValues ? ''%s'' THEN (v_FieldValues->>''%s'')::TIMESTAMP ELSE NULL END',
                lower(v_col), lower(v_col)
            );
        ELSE
            -- Text types
            v_insert_values := v_insert_values || format('v_FieldValues->>''%s''', lower(v_col));
        END IF;
    END LOOP;
    
    -- Build SELECT columns for result (all editable columns)
    FOREACH v_col IN ARRAY p_editable_cols LOOP
        IF v_select_cols != '' THEN
            v_select_cols := v_select_cols || ',' || E'\n            ';
        END IF;
        v_select_cols := v_select_cols || format('t."%s"', v_col);
    END LOOP;
    
    -- Build WHERE clause for INSERT (uses v_NewRecord from RETURNING clause)
    v_idx := 1;
    FOREACH v_pk_col IN ARRAY p_primary_key_cols LOOP
        IF v_idx > 1 THEN
            v_insert_pk_where := v_insert_pk_where || E'\n      AND ';
        END IF;
        v_insert_pk_where := v_insert_pk_where || format('t."%s" = v_NewRecord."%s"', v_pk_col, v_pk_col);
        v_idx := v_idx + 1;
    END LOOP;
    
    -- =============================================
    -- BUILD UPDATE/DELETE PROCEDURE COMPONENTS
    -- =============================================
    
    -- Build primary key parsing with type detection
    v_idx := 1;
    FOREACH v_pk_col IN ARRAY p_primary_key_cols LOOP
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_pk_col)
        LIMIT 1;
        
        v_declare_vars := v_declare_vars || format('    v_%s TEXT;%s', v_pk_col, E'\n');
        v_pk_parse := v_pk_parse || format('    v_%s := v_Parts[%s];%s', v_pk_col, v_idx, E'\n');
        
        IF v_idx > 1 THEN
            v_pk_where := v_pk_where || E'\n      AND ';
        END IF;
        
        IF v_col_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN
            v_pk_where := v_pk_where || format('"%s" = v_%s::INTEGER', v_pk_col, v_pk_col);
        ELSE
            v_pk_where := v_pk_where || format('"%s" = v_%s', v_pk_col, v_pk_col);
        END IF;
        
        v_idx := v_idx + 1;
    END LOOP;
    
    -- Build UPDATE SET clause with type detection
    -- First, add primary key columns to allow updating them
    FOREACH v_pk_col IN ARRAY p_primary_key_cols LOOP
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_pk_col)
        LIMIT 1;
        
        -- Declare new variable for updated primary key value
        v_declare_vars := v_declare_vars || format('    v_New_%s TEXT;%s', v_pk_col, E'\n');
        -- Extract new primary key value from changes JSON
        v_extract_vars := v_extract_vars || format('        v_New_%s := (p_ChangesJson::jsonb)->''%s'';%s', v_pk_col, v_pk_col, E'\n');
        
        IF v_update_sets != '' THEN
            v_update_sets := v_update_sets || ',' || E'\n        ';
        END IF;
        
        -- Add primary key to UPDATE SET clause (use new value if provided, otherwise keep old)
        IF v_col_type IN ('integer', 'bigint', 'smallint') THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_New_%s IS NULL OR v_New_%s = '''' THEN "%s" ELSE v_New_%s::INTEGER END', 
                v_pk_col, v_pk_col, v_pk_col, v_pk_col, v_pk_col);
        ELSIF v_col_type IN ('numeric', 'decimal', 'real', 'double precision') THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_New_%s IS NULL OR v_New_%s = '''' THEN "%s" ELSE v_New_%s::NUMERIC END', 
                v_pk_col, v_pk_col, v_pk_col, v_pk_col, v_pk_col);
        ELSE
            v_update_sets := v_update_sets || format('"%s" = COALESCE(NULLIF(v_New_%s, ''''), "%s")', 
                v_pk_col, v_pk_col, v_pk_col);
        END IF;
    END LOOP;
    
    -- Now add other editable columns
    FOREACH v_col IN ARRAY p_editable_cols LOOP
        -- Skip if this column is a primary key (already handled above)
        IF v_col = ANY(p_primary_key_cols) THEN
            CONTINUE;
        END IF;
        
        SELECT data_type INTO v_col_type
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          AND lower(column_name) = lower(v_col)
        LIMIT 1;
        
        v_declare_vars := v_declare_vars || format('    v_%s TEXT;%s', v_col, E'\n');
        -- FIX: Use ->> instead of -> to extract as TEXT (removes quotes)
        v_extract_vars := v_extract_vars || format('        v_%s := (p_ChangesJson::jsonb)->''%s'';%s', v_col, v_col, E'\n');
        
        IF v_update_sets != '' THEN
            v_update_sets := v_update_sets || ',' || E'\n        ';
        END IF;
        
        -- Cast based on column type
        IF v_col_type IN ('integer', 'bigint', 'smallint') THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_%s IS NULL OR v_%s = '''' THEN "%s" ELSE v_%s::INTEGER END', 
                v_col, v_col, v_col, v_col, v_col);
        ELSIF v_col_type IN ('numeric', 'decimal', 'real', 'double precision') THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_%s IS NULL OR v_%s = '''' THEN "%s" ELSE v_%s::NUMERIC END', 
                v_col, v_col, v_col, v_col, v_col);
        ELSIF v_col_type = 'boolean' THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_%s IS NULL OR v_%s = '''' THEN "%s" ELSE v_%s::BOOLEAN END', 
                v_col, v_col, v_col, v_col, v_col);
        ELSIF v_col_type = 'date' THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_%s IS NULL OR v_%s = '''' THEN "%s" ELSE v_%s::DATE END', 
                v_col, v_col, v_col, v_col, v_col);
        ELSIF v_col_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
            v_update_sets := v_update_sets || format('"%s" = CASE WHEN v_%s IS NULL OR v_%s = '''' THEN "%s" ELSE v_%s::TIMESTAMP END', 
                v_col, v_col, v_col, v_col, v_col);
        ELSE
            -- Text types
            v_update_sets := v_update_sets || format('"%s" = COALESCE(NULLIF(v_%s, ''''), "%s")', 
                v_col, v_col, v_col);
        END IF;
    END LOOP;
    
    -- =============================================
    -- GENERATE INSERT PROCEDURE
    -- =============================================
    v_insert_sql := format($PROC$
CREATE OR REPLACE FUNCTION public.%s(
    p_fieldvaluesjson text,
    p_userid integer
)
RETURNS jsonb
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_FieldValues JSONB;
    v_NewRecord RECORD;
    v_Result JSONB;
    v_ErrorMessage TEXT;
BEGIN
    -- Parse JSON input
    v_FieldValues := p_FieldValuesJson::JSONB;
    %s
    -- Insert record
    BEGIN
        INSERT INTO "%s" (
            %s
        )
        VALUES (
            %s
        )
        RETURNING * INTO v_NewRecord;
        
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'A record with this key already exists',
                'errorCode', 'DUPLICATE_VALUE'
            );
        WHEN not_null_violation THEN
            GET STACKED DIAGNOSTICS v_ErrorMessage = MESSAGE_TEXT;
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Required field is missing: ' || v_ErrorMessage,
                'errorCode', 'REQUIRED_FIELD_MISSING'
            );
        WHEN foreign_key_violation THEN
            GET STACKED DIAGNOSTICS v_ErrorMessage = MESSAGE_TEXT;
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Invalid reference to related data: ' || v_ErrorMessage,
                'errorCode', 'INVALID_REFERENCE'
            );
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_ErrorMessage = MESSAGE_TEXT;
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Database error: ' || v_ErrorMessage,
                'errorCode', 'DB_ERROR'
            );
    END;
    
    -- Build result with created row
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Record created successfully',
        'createdRow', row_to_json(t)
    )
    INTO v_Result
    FROM (
        SELECT 
            %s
        FROM "%s" t
        WHERE %s
    ) t;
    
    RETURN v_Result;
END;
$BODY$;

ALTER FUNCTION public.%s(text, integer)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.%s(text, integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.%s(text, integer) TO postgres;

COMMENT ON FUNCTION public.%s(text, integer)
    IS 'Insert a new %s record. Accepts field values as JSON and user ID. Returns success status and created row data.';
$PROC$,
        v_insert_proc_name,
        v_required_checks,
        p_table_name,
        v_insert_cols,
        v_insert_values,
        v_select_cols,
        p_table_name,
        v_insert_pk_where,  -- Use INSERT-specific WHERE clause
        v_insert_proc_name,
        v_insert_proc_name,
        v_insert_proc_name,
        v_insert_proc_name,
        p_entity_name
    );
    
    -- =============================================
    -- GENERATE UPDATE PROCEDURE
    -- =============================================
    v_update_sql := format($PROC$
CREATE OR REPLACE FUNCTION %s(
    p_RowId TEXT,
    p_ChangesJson TEXT,
    p_UserId INT DEFAULT NULL
)
RETURNS JSONB AS $BODY$
DECLARE
    v_Parts TEXT[];
%s    v_UpdateCount INT := 0;
BEGIN
    IF p_RowId IS NULL OR p_RowId = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Row ID is required', 'errorCode', 'INVALID_INPUT');
    END IF;
    
    v_Parts := string_to_array(p_RowId, '_');
    
    IF array_length(v_Parts, 1) != %s THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid ID format. Expected: %s', 'errorCode', 'INVALID_KEY_FORMAT');
    END IF;
    
%s    
    IF p_ChangesJson IS NOT NULL AND p_ChangesJson != '' THEN
%s    END IF;
    
    UPDATE "%s"
    SET %s
    WHERE %s;
    
    GET DIAGNOSTICS v_UpdateCount = ROW_COUNT;
    
    IF v_UpdateCount = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Record not found', 'errorCode', 'NOT_FOUND');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Record updated successfully', 'rowsAffected', v_UpdateCount);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error updating record: ' || SQLERRM, 'errorCode', 'UPDATE_ERROR');
END;
$BODY$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION %s TO PUBLIC;
$PROC$,
        v_update_proc_name, v_declare_vars, array_length(p_primary_key_cols, 1), v_id_format,
        v_pk_parse, v_extract_vars, p_table_name, v_update_sets, v_pk_where, v_update_proc_name
    );
    
    -- Generate DELETE Procedure
    v_delete_sql := format($PROC$
CREATE OR REPLACE FUNCTION %s(
    p_RowId TEXT,
    p_UserId INT DEFAULT NULL
)
RETURNS JSONB AS $BODY$
DECLARE
    v_Parts TEXT[];
%s    v_DeleteCount INT := 0;
BEGIN
    IF p_RowId IS NULL OR p_RowId = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Row ID is required', 'errorCode', 'INVALID_INPUT');
    END IF;
    
    v_Parts := string_to_array(p_RowId, '_');
    
    IF array_length(v_Parts, 1) != %s THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid ID format. Expected: %s', 'errorCode', 'INVALID_KEY_FORMAT');
    END IF;
    
%s    
    DELETE FROM "%s"
    WHERE %s;
    
    GET DIAGNOSTICS v_DeleteCount = ROW_COUNT;
    
    IF v_DeleteCount = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Record not found', 'errorCode', 'NOT_FOUND');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Record deleted successfully', 'rowsAffected', v_DeleteCount);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error deleting record: ' || SQLERRM, 'errorCode', 'DELETE_ERROR');
END;
$BODY$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION %s TO PUBLIC;
$PROC$,
        v_delete_proc_name, v_declare_vars, array_length(p_primary_key_cols, 1), v_id_format,
        v_pk_parse, p_table_name, v_pk_where, v_delete_proc_name
    );
    
    EXECUTE v_insert_sql;
    EXECUTE v_update_sql;
    EXECUTE v_delete_sql;
    
    RETURN format('✅ Successfully created procedures: %s, %s, and %s', v_insert_proc_name, v_update_proc_name, v_delete_proc_name);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('❌ Error generating procedures: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION Generate_CRUD_Procedures TO PUBLIC;

DO $$
BEGIN
    RAISE NOTICE '✅ Unified CRUD Generator created! Now generates INSERT, UPDATE, and DELETE procedures.';
END $$;
