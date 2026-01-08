-- =============================================
-- Grid Procedure Scaffolder (Procedures Only)
-- =============================================
-- Generates selected CUD procedures and returns registration SQL
-- to run in the main database separately
--
-- 🔍 Auto-detects primary keys, display columns, and editable columns from schema!
--
-- Minimal Usage (auto-detect everything, all operations):
--   SELECT Scaffold_Grid_Procedures(
--       p_table_name := 'Bus',
--       p_entity_name := 'Bus',
--       p_display_name := 'Bus',
--       p_database_name := 'PowerSystem'
--   );
--
-- Generate only specific operations:
--   SELECT Scaffold_Grid_Procedures(
--       p_table_name := 'Bus',
--       p_entity_name := 'Bus',
--       p_display_name := 'Bus',
--       p_database_name := 'PowerSystem',
--       p_operations := ARRAY['fetch', 'insert']  -- Only fetch and insert
--   );
--
-- Specify database name (REQUIRED):
--   SELECT Scaffold_Grid_Procedures(
--       p_table_name := 'Bus',
--       p_entity_name := 'Bus',
--       p_display_name := 'Bus',
--       p_database_name := 'PowerSystem'  -- REQUIRED parameter
--   );
--
-- Full Usage (explicit columns and operations):
--   SELECT Scaffold_Grid_Procedures(
--       p_table_name := 'Adjust',
--       p_entity_name := 'Bus_Adjusts',
--       p_display_name := 'Bus Adjustments',
--       p_display_columns := ARRAY['acctap', 'casenumber', 'adjthr', 'mxswim'],
--       p_editable_columns := ARRAY['adjthr', 'mxswim'],
--       p_allowed_roles := ARRAY['Admin', 'Manager', 'User'],
--       p_operations := ARRAY['fetch', 'insert'],  -- Skip update and delete
--       p_database_name := 'PowerSystem'
--   );
--
-- Available operations: 'fetch', 'insert', 'update', 'delete'
-- Note: 'update' and 'delete' are always created together (cannot generate one without the other)
-- =============================================

-- Drop old versions to avoid overload conflicts
DROP FUNCTION IF EXISTS Scaffold_Grid_Procedures(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS Scaffold_Grid_Procedures(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS Scaffold_Grid_Procedures(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION Scaffold_Grid_Procedures(
    p_table_name TEXT,              -- Database table name
    p_entity_name TEXT,             -- Entity name for procedures (e.g., 'Bus_Adjusts')
    p_display_name TEXT,            -- Display name for UI (e.g., 'Bus Adjustments')
    p_database_name TEXT,           -- REQUIRED: Database name for StoredProcedureRegistry
    p_display_columns TEXT[] DEFAULT NULL,   -- Optional: All columns to display (NULL = all columns)
    p_editable_columns TEXT[] DEFAULT NULL,  -- Optional: Columns that can be edited (NULL = all non-system columns)
    p_allowed_roles TEXT[] DEFAULT ARRAY['Admin', 'Manager', 'User'],  -- Roles with access
    p_operations TEXT[] DEFAULT ARRAY['fetch', 'insert', 'update', 'delete']  -- Which operations to generate
)
RETURNS TEXT AS $$
DECLARE
    v_fetch_proc_name TEXT;
    v_insert_proc_name TEXT;
    v_update_proc_name TEXT;
    v_delete_proc_name TEXT;
    v_fetch_sql TEXT;
    v_result TEXT := '';
    v_primary_keys TEXT[];
    v_all_columns TEXT[];
    v_display_columns TEXT[];
    v_editable_columns TEXT[];
BEGIN
    -- Auto-detect primary keys from schema
    SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position)
    INTO v_primary_keys
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = p_table_name;
    
    -- Validate that primary keys were found
    IF v_primary_keys IS NULL OR array_length(v_primary_keys, 1) = 0 THEN
        RETURN format('❌ ERROR: No primary key found for table "%s". Please ensure the table has a primary key defined.', p_table_name);
    END IF;
    
    -- Auto-detect all columns if not provided
    IF p_display_columns IS NULL THEN
        SELECT array_agg(column_name ORDER BY ordinal_position)
        INTO v_all_columns
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name NOT LIKE '\_%';  -- Exclude internal columns starting with _
        
        v_display_columns := v_all_columns;
        v_result := v_result || format('🔍 Auto-detected %s display columns%s', 
            array_length(v_display_columns, 1), E'\n');
    ELSE
        v_display_columns := p_display_columns;
    END IF;
    
    -- Auto-detect editable columns if not provided
    IF p_editable_columns IS NULL THEN
        SELECT array_agg(column_name ORDER BY ordinal_position)
        INTO v_editable_columns
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          -- Include primary keys UNLESS they have auto-increment defaults
          AND (
              column_name != ALL(v_primary_keys)  -- Non-PK columns
              OR (
                  column_name = ANY(v_primary_keys)  -- OR PK columns...
                  AND (column_default IS NULL OR column_default NOT LIKE 'nextval%')  -- ...without auto-increment
              )
          )
          -- Exclude common system/auto-generated columns
          AND column_name NOT IN ('created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by', 'deleted_by')
          AND column_name NOT LIKE '\_%'  -- Exclude internal columns
          -- Exclude columns with function defaults (like NOW(), uuid_generate_v4())
          AND (column_default IS NULL OR (column_default NOT LIKE '%(%' AND column_default NOT LIKE 'nextval%'));
        
        v_result := v_result || format('🔍 Auto-detected %s editable columns (excluded: auto-increment PKs, timestamps, auto-generated)%s', 
            array_length(v_editable_columns, 1), E'\n');
    ELSE
        v_editable_columns := p_editable_columns;
    END IF;
    
    v_result := v_result || format('🔍 Auto-detected primary keys: %s%s%s', 
        array_to_string(v_primary_keys, ', '), E'\n', E'\n');
    
    -- Debug: Show which operations will be generated
    v_result := v_result || format('📋 Operations to generate: %s%s%s', 
        array_to_string(p_operations, ', '), E'\n', E'\n');
    
    -- Build procedure names
    v_fetch_proc_name := 'sp_Grid_' || p_entity_name;
    v_insert_proc_name := 'sp_Grid_Insert_' || p_entity_name;
    v_update_proc_name := 'sp_Grid_Update_' || p_entity_name;
    v_delete_proc_name := 'sp_Grid_Delete_' || p_entity_name;
    
    v_result := v_result || format('🚀 Generating complete grid for %s...%s%s', p_table_name, E'\n', E'\n');
    
    -- ========================================
    -- 1. Generate FETCH procedure (if requested)
    -- ========================================
    IF 'fetch' = ANY(p_operations) THEN
        BEGIN
            v_fetch_sql := Generate_Grid_Fetch(
                p_table_name,
                p_entity_name,
                v_primary_keys,  -- Use auto-detected primary keys
                v_display_columns  -- Use auto-detected or provided display columns
            );
            
            -- Execute to create the procedure
            EXECUTE v_fetch_sql;
            
            v_result := v_result || format('✅ Created: %s%s', v_fetch_proc_name, E'\n');
        EXCEPTION
            WHEN OTHERS THEN
                v_result := v_result || format('❌ Failed to create %s: %s%s', v_fetch_proc_name, SQLERRM, E'\n');
                -- Don't RAISE - continue to show other results
        END;
    ELSE
        v_result := v_result || format('⏭️  Skipped: %s%s', v_fetch_proc_name, E'\n');
    END IF;
    
    -- ========================================
    -- 2. Generate INSERT, UPDATE & DELETE procedures (if requested)
    -- Note: Generate_CUD_Procedures creates all three procedures together
    -- ========================================
    IF 'insert' = ANY(p_operations) OR 'update' = ANY(p_operations) OR 'delete' = ANY(p_operations) THEN
        DECLARE
            v_cud_result TEXT;
        BEGIN
            -- Call Generate_CUD_Procedures and capture result
            SELECT Generate_CUD_Procedures(
                p_table_name,
                p_entity_name,
                v_primary_keys,
                v_editable_columns
            ) INTO v_cud_result;
            
            -- Show what Generate_CUD_Procedures returned
            v_result := v_result || format('🔧 CUD Generator Result: %s%s', v_cud_result, E'\n');
            
            -- All three procedures are always created together
            v_result := v_result || format('✅ Created: %s%s', v_insert_proc_name, E'\n');
            v_result := v_result || format('✅ Created: %s%s', v_update_proc_name, E'\n');
            v_result := v_result || format('✅ Created: %s%s', v_delete_proc_name, E'\n');
        EXCEPTION
            WHEN OTHERS THEN
                v_result := v_result || format('❌ Failed to create INSERT/UPDATE/DELETE: %s%s', SQLERRM, E'\n');
                -- Don't RAISE - continue to show other results
        END;
    ELSE
        v_result := v_result || format('⏭️  Skipped: %s%s', v_insert_proc_name, E'\n');
        v_result := v_result || format('⏭️  Skipped: %s%s', v_update_proc_name, E'\n');
        v_result := v_result || format('⏭️  Skipped: %s%s', v_delete_proc_name, E'\n');
    END IF;
    
    -- ========================================
    -- 4. Generate registration SQL
    -- ========================================
    v_result := v_result || E'\n' || format('
╔══════════════════════════════════════════════════════════════╗
║                    ✅ SUCCESS!                               ║
╠══════════════════════════════════════════════════════════════╣
║  Table: %s
║  Entity: %s
║
║  Created Procedures:
║    📊 %s
║    ➕ %s
║    ✏️  %s
║    🗑️  %s
║
║  Next Steps:
║    1. Run the registration SQL below in your MAIN database
║    2. Customize %s (add JOINs, filters)
║    3. Restart backend
║    4. Test in UI!
╚══════════════════════════════════════════════════════════════╝

📝 REGISTRATION SQL (Run this in your MAIN database):
────────────────────────────────────────────────────────────────

%s

────────────────────────────────────────────────────────────────
',
        p_table_name,
        p_entity_name,
        v_fetch_proc_name,
        v_insert_proc_name,
        v_update_proc_name,
        v_delete_proc_name,
        v_fetch_proc_name,
        Generate_Registration_SQL(
            v_fetch_proc_name,
            v_insert_proc_name,
            v_update_proc_name,
            v_delete_proc_name,
            p_display_name,
            p_allowed_roles,
            p_database_name
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('❌ ERROR: %s%s%sPartial result:%s%s', 
            SQLERRM, E'\n', E'\n', E'\n', v_result);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Drop old version of Generate_Registration_SQL (3 params)
-- =============================================
DROP FUNCTION IF EXISTS Generate_Registration_SQL(TEXT, TEXT, TEXT, TEXT, TEXT[]);

-- =============================================
-- Generate Registration SQL (Updated with INSERT support)
-- =============================================
CREATE OR REPLACE FUNCTION Generate_Registration_SQL(
    p_fetch_proc_name TEXT,
    p_insert_proc_name TEXT,
    p_update_proc_name TEXT,
    p_delete_proc_name TEXT,
    p_display_name TEXT,
    p_allowed_roles TEXT[],
    p_database_name TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_roles_json TEXT;
BEGIN
    -- Format roles as JSON array: ["Admin","Manager","User"]
    v_roles_json := '[' || array_to_string(
        ARRAY(SELECT '"' || r || '"' FROM unnest(p_allowed_roles) r),
        ','
    ) || ']';
    
    RETURN format($SQL$-- Delete existing entries
DELETE FROM "StoredProcedureRegistry"
WHERE "ProcedureName" IN ('%s', '%s', '%s', '%s');

-- Register procedures
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Description", "Category", "DatabaseName",
    "IsActive", "RequiresAuth", "AllowedRoles", "DefaultPageSize", "MaxPageSize",
    "CacheDurationSeconds", "CreatedAt"
)
VALUES
    -- Fetch procedure
    ('%s', '%s', 'Displays %s data', 'Grid', '%s', 
     true, true, '%s', 15, 100, 0, NOW()),
    
    -- Insert procedure (Admin/Manager only)
    ('%s', 'Insert %s', 'Inserts a new %s record', 'Grid', '%s',
     true, true, '["Admin","Manager"]', 15, 100, 0, NOW()),
    
    -- Update procedure (Admin/Manager only)
    ('%s', 'Update %s', 'Updates a single %s record', 'Grid', '%s',
     true, true, '["Admin","Manager"]', 15, 100, 0, NOW()),
    
    -- Delete procedure (Admin/Manager only)
    ('%s', 'Delete %s', 'Deletes a single %s record', 'Grid', '%s',
     true, true, '["Admin","Manager"]', 15, 100, 0, NOW())
ON CONFLICT ("ProcedureName")
DO UPDATE SET
    "DisplayName" = EXCLUDED."DisplayName",
    "Description" = EXCLUDED."Description",
    "IsActive" = EXCLUDED."IsActive",
    "AllowedRoles" = EXCLUDED."AllowedRoles",
    "UpdatedAt" = NOW();

-- Verify
SELECT "ProcedureName", "DisplayName", "IsActive", "AllowedRoles"
FROM "StoredProcedureRegistry"
WHERE "ProcedureName" IN ('%s', '%s', '%s', '%s');
$SQL$,
        p_fetch_proc_name, p_insert_proc_name, p_update_proc_name, p_delete_proc_name,  -- DELETE
        p_fetch_proc_name, p_display_name, p_display_name, p_database_name, v_roles_json,  -- Fetch
        p_insert_proc_name, p_display_name, p_display_name, p_database_name,  -- Insert
        p_update_proc_name, p_display_name, p_display_name, p_database_name,  -- Update
        p_delete_proc_name, p_display_name, p_display_name, p_database_name,  -- Delete
        p_fetch_proc_name, p_insert_proc_name, p_update_proc_name, p_delete_proc_name  -- Verify
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION Scaffold_Grid_Procedures TO PUBLIC;
GRANT EXECUTE ON FUNCTION Generate_Registration_SQL TO PUBLIC;

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            Grid Procedure Scaffolder Ready!                  ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  Creates all 4 procedures + returns registration SQL!        ║';
    RAISE NOTICE '║    📊 Fetch  ➕ Insert  ✏️  Update  🗑️  Delete                ║';
    RAISE NOTICE '║  🔍 Auto-detects PKs, display & editable columns!            ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Minimal Usage (auto-detect everything):';
    RAISE NOTICE '  SELECT Scaffold_Grid_Procedures(';
    RAISE NOTICE '      p_table_name := ''Bus'',';
    RAISE NOTICE '      p_entity_name := ''Buses'',';
    RAISE NOTICE '      p_display_name := ''Buses''';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
    RAISE NOTICE 'Full Usage (explicit columns):';
    RAISE NOTICE '  SELECT Scaffold_Grid_Procedures(';
    RAISE NOTICE '      p_table_name := ''Adjust'',';
    RAISE NOTICE '      p_entity_name := ''Bus_Adjusts'',';
    RAISE NOTICE '      p_display_name := ''Bus Adjustments'',';
    RAISE NOTICE '      p_display_columns := ARRAY[''acctap'', ''casenumber'', ''adjthr''],';
    RAISE NOTICE '      p_editable_columns := ARRAY[''adjthr'', ''mxswim'']';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Result includes ready-to-run registration SQL!';
    RAISE NOTICE '🔍 Columns are auto-detected if not specified!';
END $$;
