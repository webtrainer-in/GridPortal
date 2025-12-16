-- =============================================
-- Updated sp_grid_buses with Zone Name JOIN
-- Includes zoneName in results to display labels immediately
-- =============================================

CREATE OR REPLACE FUNCTION public.sp_grid_buses(
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
    
    -- Get data rows with filters and search (includes zoneName via JOIN)
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
				z.zoname AS "zone",
                b."Izone",
                b."AreaCaseNumber",
                b."OwnerCaseNumber",
                b."ZoneCaseNumber"
            FROM "Bus" b
            LEFT JOIN "Zone" z ON z.izone = b.zone AND z."CaseNumber" = b."CaseNumber"
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
    
    -- Define base column metadata (zoneName added as display column)
    v_BaseColumns := '[
        {"field": "actions", "headerName": "Actions", "width": 120, "sortable": false, "filter": false, "pinned": true},
        {"field": "ibus", "headerName": "Bus Number", "type": "number", "width": 120, "sortable": true, "filter": true, "editable": false},
        {"field": "CaseNumber", "headerName": "Case Number", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": false},
        {"field": "name", "headerName": "Name", "type": "text", "width": 200, "sortable": true, "filter": true, "editable": true, "cellEditor": "agTextCellEditor"},
        {"field": "baskv", "headerName": "Base KV", "type": "number", "width": 120, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "iarea", "headerName": "Area", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "dropdown"},
        {"field": "zone", "headerName": "Zone", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "dropdown"},
        {"field": "iowner", "headerName": "Owner", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "ide", "headerName": "IDE", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "vm", "headerName": "VM", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "va", "headerName": "VA", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "nvhi", "headerName": "NV High", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "nvlo", "headerName": "NV Low", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "evhi", "headerName": "EV High", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "evlo", "headerName": "EV Low", "type": "number", "width": 110, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "Izone", "headerName": "I Zone", "type": "number", "width": 100, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "AreaCaseNumber", "headerName": "Area Case #", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "OwnerCaseNumber", "headerName": "Owner Case #", "type": "number", "width": 140, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"},
        {"field": "ZoneCaseNumber", "headerName": "Zone Case #", "type": "number", "width": 130, "sortable": true, "filter": true, "editable": true, "cellEditor": "agNumberCellEditor"}
    ]'::JSONB;
    
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
    WHERE cm."ProcedureName" = 'sp_Grid_Buses'
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
    
    -- Return combined result
    RETURN jsonb_build_object(
        'rows', COALESCE(v_Data, '[]'::JSONB),
        'columns', COALESCE(v_Columns, '[]'::JSONB),
        'totalCount', v_TotalCount,
        'pageNumber', p_PageNumber,
        'pageSize', p_PageSize,
        'totalPages', CEIL(v_TotalCount::NUMERIC / p_PageSize)
    );
END;
$BODY$;

ALTER FUNCTION public.sp_grid_buses(integer, integer, integer, integer, character varying, character varying, text, character varying)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.sp_grid_buses(integer, integer, integer, integer, character varying, character varying, text, character varying) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.sp_grid_buses(integer, integer, integer, integer, character varying, character varying, text, character varying) TO postgres;
