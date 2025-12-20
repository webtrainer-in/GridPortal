-- =============================================
-- Grid Procedure Scaffolder (Procedures Only)
-- =============================================
-- Generates all 3 procedures and returns registration SQL
-- to run in the main database separately
--
-- Usage Example:
--   SELECT Scaffold_Grid_Procedures(
--       p_table_name := 'Adjust',
--       p_entity_name := 'Bus_Adjusts',
--       p_display_name := 'Bus Adjustments',
--       p_primary_keys := ARRAY['acctap', 'casenumber'],
--       p_display_columns := ARRAY['acctap', 'casenumber', 'adjthr', 'mxswim', 'mxtpss', 'swvbnd'],
--       p_editable_columns := ARRAY['adjthr', 'mxswim', 'mxtpss', 'swvbnd'],
--       p_allowed_roles := ARRAY['Admin', 'Manager', 'User']
--   );
-- =============================================

CREATE OR REPLACE FUNCTION Scaffold_Grid_Procedures(
    p_table_name TEXT,              -- Database table name
    p_entity_name TEXT,             -- Entity name for procedures (e.g., 'Bus_Adjusts')
    p_display_name TEXT,            -- Display name for UI (e.g., 'Bus Adjustments')
    p_primary_keys TEXT[],          -- Primary key columns (case-insensitive)
    p_display_columns TEXT[],       -- All columns to display in grid
    p_editable_columns TEXT[],      -- Columns that can be edited
    p_allowed_roles TEXT[] DEFAULT ARRAY['Admin', 'Manager', 'User']  -- Roles with access
)
RETURNS TEXT AS $$
DECLARE
    v_fetch_proc_name TEXT;
    v_update_proc_name TEXT;
    v_delete_proc_name TEXT;
    v_fetch_sql TEXT;
    v_result TEXT := '';
BEGIN
    -- Build procedure names
    v_fetch_proc_name := 'sp_Grid_' || p_entity_name;
    v_update_proc_name := 'sp_Grid_Update_' || p_entity_name;
    v_delete_proc_name := 'sp_Grid_Delete_' || p_entity_name;
    
    v_result := format('🚀 Generating complete grid for %s...%s%s', p_table_name, E'\n', E'\n');
    
    -- ========================================
    -- 1. Generate FETCH procedure
    -- ========================================
    BEGIN
        v_fetch_sql := generate_grid_fetch_procedure(
            p_table_name,
            p_entity_name,
            p_primary_keys,
            p_display_columns
        );
        
        -- Execute to create the procedure
        EXECUTE v_fetch_sql;
        
        v_result := v_result || format('✅ Created: %s%s', v_fetch_proc_name, E'\n');
    EXCEPTION
        WHEN OTHERS THEN
            v_result := v_result || format('❌ Failed to create %s: %s%s', v_fetch_proc_name, SQLERRM, E'\n');
            RAISE;
    END;
    
    -- ========================================
    -- 2. Generate UPDATE & DELETE procedures
    -- ========================================
    BEGIN
        PERFORM generate_grid_crud_procedures(
            p_table_name,
            p_entity_name,
            p_primary_keys,
            p_editable_columns
        );
        
        v_result := v_result || format('✅ Created: %s%s', v_update_proc_name, E'\n');
        v_result := v_result || format('✅ Created: %s%s', v_delete_proc_name, E'\n');
    EXCEPTION
        WHEN OTHERS THEN
            v_result := v_result || format('❌ Failed to create UPDATE/DELETE: %s%s', SQLERRM, E'\n');
            RAISE;
    END;
    
    -- ========================================
    -- 3. Generate registration SQL
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
        v_update_proc_name,
        v_delete_proc_name,
        v_fetch_proc_name,
        generate_registration_sql(
            v_fetch_proc_name,
            v_update_proc_name,
            v_delete_proc_name,
            p_display_name,
            p_allowed_roles
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
-- Generate Registration SQL
-- =============================================
CREATE OR REPLACE FUNCTION generate_registration_sql(
    p_fetch_proc_name TEXT,
    p_update_proc_name TEXT,
    p_delete_proc_name TEXT,
    p_display_name TEXT,
    p_allowed_roles TEXT[]
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
WHERE "ProcedureName" IN ('%s', '%s', '%s');

-- Register procedures
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Description", "Category", "DatabaseName",
    "IsActive", "RequiresAuth", "AllowedRoles", "DefaultPageSize", "MaxPageSize",
    "CacheDurationSeconds", "CreatedAt"
)
VALUES
    -- Fetch procedure
    ('%s', '%s', 'Displays %s data', 'Grid', 'PowerSystem', 
     true, true, '%s', 15, 100, 0, NOW()),
    
    -- Update procedure (Admin/Manager only)
    ('%s', 'Update %s', 'Updates a single %s record', 'Grid', 'PowerSystem',
     true, true, '["Admin","Manager"]', 15, 100, 0, NOW()),
    
    -- Delete procedure (Admin/Manager only)
    ('%s', 'Delete %s', 'Deletes a single %s record', 'Grid', 'PowerSystem',
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
WHERE "ProcedureName" IN ('%s', '%s', '%s');
$SQL$,
        p_fetch_proc_name, p_update_proc_name, p_delete_proc_name,  -- DELETE
        p_fetch_proc_name, p_display_name, p_display_name, v_roles_json,  -- Fetch (now JSON)
        p_update_proc_name, p_display_name, p_display_name,  -- Update
        p_delete_proc_name, p_display_name, p_display_name,  -- Delete
        p_fetch_proc_name, p_update_proc_name, p_delete_proc_name  -- Verify
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION Scaffold_Grid_Procedures TO PUBLIC;
GRANT EXECUTE ON FUNCTION generate_registration_sql TO PUBLIC;

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║            Grid Procedure Scaffolder Ready!                  ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  Creates all 3 procedures + returns registration SQL!        ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '  SELECT Scaffold_Grid_Procedures(';
    RAISE NOTICE '      p_table_name := ''Adjust'',';
    RAISE NOTICE '      p_entity_name := ''Bus_Adjusts'',';
    RAISE NOTICE '      p_display_name := ''Bus Adjustments'',';
    RAISE NOTICE '      p_primary_keys := ARRAY[''acctap'', ''casenumber''],';
    RAISE NOTICE '      p_display_columns := ARRAY[''acctap'', ''casenumber'', ''adjthr''],';
    RAISE NOTICE '      p_editable_columns := ARRAY[''adjthr'', ''mxswim''],';
    RAISE NOTICE '      p_allowed_roles := ARRAY[''Admin'', ''Manager'', ''User'']';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Result includes ready-to-run registration SQL!';
END $$;
