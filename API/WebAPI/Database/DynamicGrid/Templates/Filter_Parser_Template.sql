-- AG Grid Filter Parser Template
-- This template is used by Generate_Grid_Fetch to create runtime filter parsing logic
-- Placeholders: {{COLUMN_TYPE_MAP}}

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
