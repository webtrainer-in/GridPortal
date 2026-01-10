-- =============================================
-- Scaffold Grid Procedures - Complete Examples
-- =============================================
-- This document contains sample scripts for:
-- 1. Minimal scaffolding (auto-detection)
-- 2. Full scaffolding with all parameters
-- 3. Testing each generated CRUD method
-- =============================================

SELECT Scaffold_Grid_Procedures(
    p_table_name := 'Transformer',
    p_entity_name := 'T1',
    p_display_name := 'T1',
    p_database_name := 'PowerSystem'
	,p_operations := ARRAY['fetch']
);


-- =============================================
-- WHEN TO USE FULL PARAMETERS
-- =============================================
-- Use explicit parameters when:
-- 1. Table has no primary key constraint (must specify p_primary_key_cols)
-- 2. You want to limit editable columns (specify p_editable_cols)
-- 3. You want specific operations only (specify p_operations)
-- 4. Auto-detection picks wrong columns
-- =============================================
-- EXAMPLE 1: Simple Entity (Bus)
-- =============================================
-- Step 1: Scaffold all procedures (FETCH, INSERT, UPDATE, DELETE)
SELECT Scaffold_Grid_Procedures(
    p_table_name := 'Bus',
    p_entity_name := 'Buses',
    p_display_name := 'Buses',
    p_database_name := 'PowerSystem',
    p_primary_key_cols := ARRAY['ibus', 'CaseNumber'],
    p_editable_cols := ARRAY['ibus', 'CaseNumber', 'name', 'baskv', 'ide', 'area', 'zone', 'owner', 'vm', 'va'],
    p_operations := ARRAY['fetch', 'insert', 'update', 'delete']
);
-- Step 2: Execute the generated registration SQL
-- Copy the registration SQL from the output above and execute it
-- Step 3: Test FETCH procedure
SELECT sp_Grid_Buses(
    p_PageNumber := 1,
    p_PageSize := 10,
    p_SortColumn := 'name',
    p_SortDirection := 'ASC',
    p_FilterJson := NULL,
    p_SearchTerm := NULL,
    p_DrillDownJson := NULL
);
-- Step 4: Test INSERT procedure
SELECT sp_Grid_Insert_Buses(
    p_FieldValuesJson := '{
        "ibus": 999,
        "casenumber": 1,
        "name": "Test Bus",
        "baskv": 138.0,
        "ide": 1,
        "area": 1,
        "zone": 1,
        "owner": 1,
        "vm": 1.0,
        "va": 0.0
    }',
    p_UserId := 1
);
-- Step 5: Test UPDATE procedure
SELECT sp_Grid_Update_Buses(
    p_RowId := '999_1',  -- Format: ibus_CaseNumber
    p_ChangesJson := '{
        "name": "Updated Test Bus",
        "baskv": 230.0
    }',
    p_UserId := 1
);
-- Step 6: Test DELETE procedure
SELECT sp_Grid_Delete_Buses(
    p_RowId := '999_1',
    p_UserId := 1
);
-- =============================================
-- EXAMPLE 2: Complex Entity with Multiple PKs (ACLine)
-- =============================================
-- Step 1: Scaffold procedures
SELECT Scaffold_Grid_Procedures(
    p_table_name := 'Acline',
    p_entity_name := 'AC3',
    p_display_name := 'AC Lines',
    p_database_name := 'PowerSystem',
    p_primary_key_cols := ARRAY['ckt', 'ibus', 'jbus', 'CaseNumber'],
    p_editable_cols := ARRAY['ckt', 'ibus', 'jbus', 'CaseNumber', 'name', 'rpu', 'xpu', 'bpu'],
    p_operations := ARRAY['fetch', 'insert', 'update', 'delete']
);
-- Step 2: Test FETCH with drill-down filters
SELECT sp_Grid_AC3(
    p_PageNumber := 1,
    p_PageSize := 10,
    p_DrillDownJson := '{"ibus": 205, "CaseNumber": 1}'
);
-- Step 3: Test INSERT
SELECT sp_Grid_Insert_AC3(
    p_FieldValuesJson := '{
        "ckt": "TEST",
        "ibus": 205,
        "jbus": 206,
        "casenumber": 1,
        "name": "Test Line",
        "rpu": 0.01,
        "xpu": 0.05,
        "bpu": 0.02
    }',
    p_UserId := 1
);
-- Step 4: Test UPDATE
SELECT sp_Grid_Update_AC3(
    p_RowId := 'TEST_205_206_1',  -- Format: ckt_ibus_jbus_CaseNumber
    p_ChangesJson := '{
        "name": "Updated Test Line",
        "rpu": 0.015
    }',
    p_UserId := 1
);
-- Step 5: Test DELETE
SELECT sp_Grid_Delete_AC3(
    p_RowId := 'TEST_205_206_1',
    p_UserId := 1
);
-- =============================================
-- EXAMPLE 3: Scaffold Only Specific Operations
-- =============================================
-- Only FETCH and INSERT (no UPDATE/DELETE)
SELECT Scaffold_Grid_Procedures(
    p_table_name := 'Generator',
    p_entity_name := 'Generators',
    p_display_name := 'Generators',
    p_database_name := 'PowerSystem',
    p_primary_key_cols := ARRAY['ibus', 'id', 'CaseNumber'],
    p_editable_cols := ARRAY['ibus', 'id', 'CaseNumber', 'pg', 'qg', 'qt', 'qb', 'vs', 'stat'],
    p_operations := ARRAY['fetch', 'insert']
);
-- =============================================
-- EXAMPLE 4: Testing with AG Grid Filters
-- =============================================
-- Test FETCH with column filters
SELECT sp_Grid_Buses(
    p_PageNumber := 1,
    p_PageSize := 10,
    p_FilterJson := '{
        "name": {
            "filterType": "text",
            "type": "contains",
            "filter": "Bus"
        },
        "baskv": {
            "filterType": "number",
            "type": "greaterThan",
            "filter": 100
        }
    }',
    p_SearchTerm := NULL,
    p_DrillDownJson := NULL
);
-- =============================================
-- EXAMPLE 5: Testing with Search Term
-- =============================================
-- Test FETCH with global search
SELECT sp_Grid_Buses(
    p_PageNumber := 1,
    p_PageSize := 10,
    p_SearchTerm := 'Default',
    p_FilterJson := NULL,
    p_DrillDownJson := NULL
);
-- =============================================
-- EXAMPLE 6: Testing Windowed Scrolling
-- =============================================
-- Fetch rows 50-100 (for infinite scroll)
SELECT sp_Grid_Buses(
    p_PageNumber := NULL,
    p_PageSize := NULL,
    p_StartRow := 50,
    p_EndRow := 100,
    p_SortColumn := 'ibus',
    p_SortDirection := 'ASC'
);
-- =============================================
-- EXAMPLE 7: Error Handling Tests
-- =============================================
-- Test INSERT with missing required field
SELECT sp_Grid_Insert_Buses(
    p_FieldValuesJson := '{
        "ibus": 999
    }',
    p_UserId := 1
);
-- Expected: Error - "CaseNumber is required"
-- Test UPDATE with invalid ID format
SELECT sp_Grid_Update_Buses(
    p_RowId := 'invalid_id',
    p_ChangesJson := '{"name": "Test"}',
    p_UserId := 1
);
-- Expected: Error - "Invalid ID format"
-- Test DELETE non-existent record
SELECT sp_Grid_Delete_Buses(
    p_RowId := '99999_99999',
    p_UserId := 1
);
-- Expected: Error - "Record not found"
-- =============================================
-- EXAMPLE 8: Batch Operations
-- =============================================
-- Insert multiple records
DO $$
DECLARE
    v_result JSONB;
BEGIN
    -- Insert Bus 1
    SELECT sp_Grid_Insert_Buses(
        '{"ibus": 1001, "casenumber": 1, "name": "Bus 1001", "baskv": 138, "ide": 1, "area": 1, "zone": 1, "owner": 1, "vm": 1.0, "va": 0.0}',
        1
    ) INTO v_result;
    RAISE NOTICE 'Insert 1: %', v_result;
    
    -- Insert Bus 2
    SELECT sp_Grid_Insert_Buses(
        '{"ibus": 1002, "casenumber": 1, "name": "Bus 1002", "baskv": 138, "ide": 1, "area": 1, "zone": 1, "owner": 1, "vm": 1.0, "va": 0.0}',
        1
    ) INTO v_result;
    RAISE NOTICE 'Insert 2: %', v_result;
END $$;
-- =============================================
-- EXAMPLE 9: Verify Generated Procedures
-- =============================================
-- List all generated procedures for an entity
SELECT 
    p.proname AS procedure_name,
    pg_get_function_arguments(p.oid) AS parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'sp_grid_%buses%'
ORDER BY p.proname;
-- =============================================
-- EXAMPLE 10: Re-scaffold After Schema Changes
-- =============================================
-- If you add/remove columns, re-run scaffold with updated editable_cols
SELECT Scaffold_Grid_Procedures(
    p_table_name := 'Bus',
    p_entity_name := 'Buses',
    p_display_name := 'Buses',
    p_database_name := 'PowerSystem',
    p_primary_key_cols := ARRAY['ibus', 'CaseNumber'],
    p_editable_cols := ARRAY['ibus', 'CaseNumber', 'name', 'baskv', 'ide', 'area', 'zone', 'owner', 'vm', 'va', 'new_column'],
    p_operations := ARRAY['fetch', 'insert', 'update', 'delete']
);
-- =============================================
-- NOTES
-- =============================================
-- 1. Row ID Format: Primary key values joined with underscore
--    Example: For PKs [ibus, CaseNumber], ID = "205_1"
--
-- 2. JSON Field Names: Use lowercase field names in JSON
--    Example: "casenumber" not "CaseNumber"
--
-- 3. NULL Handling: Omit fields from JSON to keep existing values
--    Example: UPDATE only name: {"name": "New Name"}
--
-- 4. Type Casting: Automatic based on column type
--    - Integer: Casts to INTEGER
--    - Numeric: Casts to NUMERIC
--    - Text: No casting (uses ->> operator)
--
-- 5. Drill-Down Filters: Use p_DrillDownJson for filtering
--    Example: '{"ibus": 205, "CaseNumber": 1}'
--
-- 6. Alternate Columns: Configure in ColumnMetadata.LinkConfig
--    Example: "alternateColumns": "ibus,jbus,kbus"