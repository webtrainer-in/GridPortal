-- Script to test sp_grid_ac function
-- This function retrieves AC line data with pagination, filtering, and search capabilities

-- Example 1: Basic call with minimal parameters (first page, default page size)
-- Replace 12345 with an actual bus number from your Acline table
SELECT * FROM sp_grid_ac(
    p_PageNumber := 1,           -- First page
    p_PageSize := 15,            -- 15 rows per page
    p_StartRow := NULL,          -- Not using row-based pagination
    p_EndRow := NULL,            -- Not using row-based pagination
    p_SortColumn := NULL,        -- No specific sort column
    p_SortDirection := 'ASC',    -- Ascending sort
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',  -- Filter by bus number and case number
    p_SearchTerm := NULL         -- No search term
);

-- Example 2: With search term
SELECT * FROM sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := NULL,
    p_SortDirection := 'ASC',
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := 'LINE'       -- Search for 'LINE' in any column
);

-- Example 3: Using row-based pagination (for AG Grid infinite scroll)
SELECT * FROM sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := 1,             -- Start from row 1
    p_EndRow := 100,             -- End at row 100
    p_SortColumn := 'ckt',       -- Sort by circuit
    p_SortDirection := 'DESC',   -- Descending sort
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := NULL
);

-- Example 4: With AG Grid column filters
-- This example shows filtering with AG Grid filter model format
SELECT * FROM sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := NULL,
    p_SortDirection := 'ASC',
    p_FilterJson := '{
        "BusNumber": 12345,
        "CaseNumber": 1,
        "name": {
            "filterType": "text",
            "type": "contains",
            "filter": "TRANS"
        },
        "rate1": {
            "filterType": "number",
            "type": "greaterThan",
            "filter": 100
        }
    }',
    p_SearchTerm := NULL
);

-- Example 5: Get all data for a specific bus (no pagination)
-- Useful for exporting or analysis
SELECT * FROM sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 10000,         -- Large page size to get all rows
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := 'ckt',
    p_SortDirection := 'ASC',
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := NULL
);

-- Example 6: Pretty print the JSON result
-- This makes it easier to read the output
SELECT jsonb_pretty(
    sp_grid_ac(
        p_PageNumber := 1,
        p_PageSize := 5,
        p_StartRow := NULL,
        p_EndRow := NULL,
        p_SortColumn := NULL,
        p_SortDirection := 'ASC',
        p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
        p_SearchTerm := NULL
    )
);

-- Example 7: Extract specific fields from the result
-- Get just the rows array
SELECT (sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := NULL,
    p_SortDirection := 'ASC',
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := NULL
))->>'rows' AS rows;

-- Get just the total count
SELECT (sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := NULL,
    p_SortDirection := 'ASC',
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := NULL
))->>'totalCount' AS total_count;

-- Get column definitions
SELECT (sp_grid_ac(
    p_PageNumber := 1,
    p_PageSize := 15,
    p_StartRow := NULL,
    p_EndRow := NULL,
    p_SortColumn := NULL,
    p_SortDirection := 'ASC',
    p_FilterJson := '{"BusNumber": 12345, "CaseNumber": 1}',
    p_SearchTerm := NULL
))->>'columns' AS columns;

/*
NOTES:
1. Replace 12345 with an actual bus number (ibus or jbus) from your Acline table
2. Replace 1 with an actual CaseNumber from your data
3. The function filters AC lines where the specified bus number appears as either ibus or jbus
4. The FilterJson parameter must include both BusNumber and CaseNumber
5. All AG Grid filter types are supported (contains, equals, greaterThan, etc.)
6. The function returns a JSONB object with:
   - rows: Array of AC line data
   - columns: Column definitions for AG Grid
   - totalCount: Total number of matching rows
   - pageNumber: Current page number
   - pageSize: Rows per page
   - totalPages: Total number of pages
*/
