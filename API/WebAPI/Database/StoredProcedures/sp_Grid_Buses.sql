-- =============================================
-- PostgreSQL Function: sp_Grid_Buses
-- Description: Dynamic grid function for bus data
-- Returns: Single JSONB object with rows, columns, and totalCount
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Buses(
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
    v_FilterWhere TEXT := '';
    v_FilterJson JSONB;
    v_FilterKeys TEXT[];
    v_FilterKey TEXT;
    v_FilterValue JSONB;
    v_FilterType TEXT;
    v_FilterText TEXT;
    v_FilterNumber NUMERIC;
    v_Condition TEXT;
BEGIN
    -- Determine offset and fetch size
    IF p_StartRow IS NOT NULL AND p_EndRow IS NOT NULL THEN
        v_Offset := p_StartRow - 1;
        v_FetchSize := p_EndRow - p_StartRow + 1;
    ELSE
        v_Offset := (p_PageNumber - 1) * p_PageSize;
        v_FetchSize := p_PageSize;
    END IF;
    
    -- Parse filter JSON if provided
    IF p_FilterJson IS NOT NULL AND p_FilterJson != '' THEN
        v_FilterJson := p_FilterJson::JSONB;
        v_FilterKeys := ARRAY(SELECT jsonb_object_keys(v_FilterJson));
        
        FOREACH v_FilterKey IN ARRAY v_FilterKeys
        LOOP
            v_FilterValue := v_FilterJson->v_FilterKey;
            
            IF v_FilterValue ? 'filterType' THEN
                DECLARE
                    v_ColumnType TEXT;
                BEGIN
                    v_FilterType := v_FilterValue->>'filterType';
                    
                    -- Determine column type
                    v_ColumnType := CASE v_FilterKey
                        WHEN 'ibus' THEN 'number'
                        WHEN 'CaseNumber' THEN 'number'
                        WHEN 'iarea' THEN 'number'
                        WHEN 'baskv' THEN 'number'
                        WHEN 'evhi' THEN 'number'
                        WHEN 'evlo' THEN 'number'
                        WHEN 'ide' THEN 'number'
                        WHEN 'nvhi' THEN 'number'
                        WHEN 'nvlo' THEN 'number'
                        WHEN 'iowner' THEN 'number'
                        WHEN 'va' THEN 'number'
                        WHEN 'vm' THEN 'number'
                        WHEN 'zone' THEN 'number'
                        WHEN 'Izone' THEN 'number'
                        WHEN 'AreaCaseNumber' THEN 'number'
                        WHEN 'OwnerCaseNumber' THEN 'number'
                        WHEN 'ZoneCaseNumber' THEN 'number'
                        ELSE 'text'
                    END;
                    
                    IF v_ColumnType = 'text' THEN
                        v_FilterText := v_FilterValue->>'filter';
                        CASE v_FilterType
                            WHEN 'contains' THEN
                                v_Condition := format('b.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                            WHEN 'notContains' THEN
                                v_Condition := format('b.%I NOT ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                            WHEN 'equals' THEN
                                v_Condition := format('b.%I ILIKE %L', v_FilterKey, v_FilterText);
                            WHEN 'notEqual' THEN
                                v_Condition := format('b.%I NOT ILIKE %L', v_FilterKey, v_FilterText);
                            WHEN 'startsWith' THEN
                                v_Condition := format('b.%I ILIKE %L', v_FilterKey, v_FilterText || '%');
                            WHEN 'endsWith' THEN
                                v_Condition := format('b.%I ILIKE %L', v_FilterKey, '%' || v_FilterText);
                            ELSE
                                v_Condition := format('b.%I ILIKE %L', v_FilterKey, '%' || v_FilterText || '%');
                        END CASE;
                    ELSIF v_ColumnType = 'number' THEN
                        v_FilterNumber := (v_FilterValue->>'filter')::NUMERIC;
                        CASE v_FilterType
                            WHEN 'equals' THEN
                                v_Condition := format('b.%I = %s', v_FilterKey, v_FilterNumber);
                            WHEN 'notEqual' THEN
                                v_Condition := format('b.%I != %s', v_FilterKey, v_FilterNumber);
                            WHEN 'lessThan' THEN
                                v_Condition := format('b.%I < %s', v_FilterKey, v_FilterNumber);
                            WHEN 'lessThanOrEqual' THEN
                                v_Condition := format('b.%I <= %s', v_FilterKey, v_FilterNumber);
                            WHEN 'greaterThan' THEN
                                v_Condition := format('b.%I > %s', v_FilterKey, v_FilterNumber);
                            WHEN 'greaterThanOrEqual' THEN
                                v_Condition := format('b.%I >= %s', v_FilterKey, v_FilterNumber);
                            ELSE
                                v_Condition := format('b.%I = %s', v_FilterKey, v_FilterNumber);
                        END CASE;
                    END IF;
                    
                    IF v_FilterWhere != '' THEN
                        v_FilterWhere := v_FilterWhere || ' AND ';
                    END IF;
                    
                    v_FilterWhere := v_FilterWhere || v_Condition;
                END;
            END IF;
        END LOOP;
    END IF;
    
    -- Get total count with filters and search
    EXECUTE format('
        SELECT COUNT(*) 
        FROM "Bus" b
        WHERE (1=1)
            AND ($1 IS NULL OR 
                 b."name" ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(b."ibus" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(b."CaseNumber" AS TEXT) ILIKE ''%%'' || $1 || ''%%'' OR
                 CAST(b."baskv" AS TEXT) ILIKE ''%%'' || $1 || ''%%'')
            %s',
        CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END
    ) INTO v_TotalCount USING p_SearchTerm;
    
    -- Get data rows with filters and search
    EXECUTE format('
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT 
                (b.ibus::TEXT || ''_'' || b."CaseNumber"::TEXT) AS "Id",
                b.ibus,
                b."CaseNumber",
                b.iarea,
                b.baskv,
                b.evhi,
                b.evlo,
                b.ide,
                b.name,
                b.nvhi,
                b.nvlo,
                b.iowner,
                b.va,
                b.vm,
                b.zone,
                b."Izone",
                b."AreaCaseNumber",
                b."OwnerCaseNumber",
                b."ZoneCaseNumber"
            FROM "Bus" b
            WHERE (1=1)
                AND ($1 IS NULL OR 
                     b.name ILIKE ''%%%%'' || $1 || ''%%%%'' OR
                     CAST(b.ibus AS TEXT) ILIKE ''%%%%'' || $1 || ''%%%%'' OR
                     CAST(b."CaseNumber" AS TEXT) ILIKE ''%%%%'' || $1 || ''%%%%'' OR
                     CAST(b.baskv AS TEXT) ILIKE ''%%%%'' || $1 || ''%%%%'')
                %s
            ORDER BY 
                CASE WHEN $2 = ''ibus'' AND $3 = ''ASC'' THEN b.ibus END ASC,
                CASE WHEN $2 = ''ibus'' AND $3 = ''DESC'' THEN b.ibus END DESC,
                CASE WHEN $2 = ''CaseNumber'' AND $3 = ''ASC'' THEN b."CaseNumber" END ASC,
                CASE WHEN $2 = ''CaseNumber'' AND $3 = ''DESC'' THEN b."CaseNumber" END DESC,
                CASE WHEN $2 = ''name'' AND $3 = ''ASC'' THEN b.name END ASC,
                CASE WHEN $2 = ''name'' AND $3 = ''DESC'' THEN b.name END DESC,
                CASE WHEN $2 = ''baskv'' AND $3 = ''ASC'' THEN b.baskv END ASC,
                CASE WHEN $2 = ''baskv'' AND $3 = ''DESC'' THEN b.baskv END DESC,
                b.ibus ASC
            LIMIT $4 OFFSET $5
        ) t',
        CASE WHEN v_FilterWhere != '' THEN 'AND ' || v_FilterWhere ELSE '' END
    ) INTO v_Data USING p_SearchTerm, p_SortColumn, p_SortDirection, v_FetchSize, v_Offset;
    
    -- Define column metadata
    v_Columns := '[
        {"field": "actions", "headerName": "Actions", "width": 120, "sortable": false, "filter": false, "pinned": true},
        {"field": "ibus", "headerName": "Bus Number", "type": "number", "width": 120, "sortable": true, "filter": true, "editable": false},
        {"field": "CaseNumber", "headerName": "Case Number", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": false},
        {"field": "name", "headerName": "Name", "type": "text", "width": 200, "sortable": true, "filter": true, "editable": true},
        {"field": "baskv", "headerName": "Base KV", "type": "number", "width": 120, "sortable": true, "filter": true, "editable": true},
        {"field": "iarea", "headerName": "Area", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "zone", "headerName": "Zone", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "iowner", "headerName": "Owner", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "ide", "headerName": "IDE", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "vm", "headerName": "VM", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "va", "headerName": "VA", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "nvhi", "headerName": "NV High", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true},
        {"field": "nvlo", "headerName": "NV Low", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true},
        {"field": "evhi", "headerName": "EV High", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true},
        {"field": "evlo", "headerName": "EV Low", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true},
        {"field": "Izone", "headerName": "I Zone", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true},
        {"field": "AreaCaseNumber", "headerName": "Area Case #", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": true},
        {"field": "OwnerCaseNumber", "headerName": "Owner Case #", "type": "number", "width": 140, "sortable": true, "filter": true, "editable": true},
        {"field": "ZoneCaseNumber", "headerName": "Zone Case #", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": true}
    ]'::JSONB;
    
    -- Return combined result
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::JSONB),
        'columns', v_Columns,
        'totalCount', v_TotalCount,
        'pageNumber', p_PageNumber,
        'pageSize', p_PageSize,
        'totalPages', CEIL(v_TotalCount::NUMERIC / p_PageSize)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sp_Grid_Buses(INT, INT, INT, INT, VARCHAR, VARCHAR, TEXT, VARCHAR) TO PUBLIC;
