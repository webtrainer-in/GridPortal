-- =============================================
-- Insert stored procedure for Bus table
-- Accepts field values as JSON and returns the created row
-- =============================================

CREATE OR REPLACE FUNCTION public.sp_grid_insert_bus(
    p_fieldvaluesjson text,
    p_userid integer
)
RETURNS jsonb
LANGUAGE 'plpgsql'
COST 100
VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_FieldValues JSONB;
    v_NewBus RECORD;
    v_Result JSONB;
    v_ErrorMessage TEXT;
BEGIN
    -- Parse the JSON input
    v_FieldValues := p_FieldValuesJson::JSONB;
    
    -- Validate required fields
    IF NOT (v_FieldValues ? 'ibus') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Bus Number (ibus) is required',
            'errorCode', 'REQUIRED_FIELD_MISSING'
        );
    END IF;
    
    IF NOT (v_FieldValues ? 'CaseNumber') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Case Number is required',
            'errorCode', 'REQUIRED_FIELD_MISSING'
        );
    END IF;
    
    -- Insert the new bus record
    BEGIN
        INSERT INTO "Bus" (
            ibus,
            "CaseNumber",
            name,
            baskv,
            iarea,
            zone,
            iowner,
            ide,
            vm,
            va,
            nvhi,
            nvlo,
            evhi,
            evlo,
            "Izone",
            "AreaCaseNumber",
            "OwnerCaseNumber",
            "ZoneCaseNumber"
        )
        VALUES (
            (v_FieldValues->>'ibus')::INTEGER,
            (v_FieldValues->>'CaseNumber')::INTEGER,
            v_FieldValues->>'name',
            CASE WHEN v_FieldValues ? 'baskv' THEN (v_FieldValues->>'baskv')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'iarea' THEN (v_FieldValues->>'iarea')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'zone' THEN (v_FieldValues->>'zone')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'iowner' THEN (v_FieldValues->>'iowner')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'ide' THEN (v_FieldValues->>'ide')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'vm' THEN (v_FieldValues->>'vm')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'va' THEN (v_FieldValues->>'va')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'nvhi' THEN (v_FieldValues->>'nvhi')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'nvlo' THEN (v_FieldValues->>'nvlo')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'evhi' THEN (v_FieldValues->>'evhi')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'evlo' THEN (v_FieldValues->>'evlo')::NUMERIC ELSE NULL END,
            CASE WHEN v_FieldValues ? 'Izone' THEN (v_FieldValues->>'Izone')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'AreaCaseNumber' THEN (v_FieldValues->>'AreaCaseNumber')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'OwnerCaseNumber' THEN (v_FieldValues->>'OwnerCaseNumber')::INTEGER ELSE NULL END,
            CASE WHEN v_FieldValues ? 'ZoneCaseNumber' THEN (v_FieldValues->>'ZoneCaseNumber')::INTEGER ELSE NULL END
        )
        RETURNING * INTO v_NewBus;
        
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'A bus with this Bus Number and Case Number already exists',
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
    
    -- Build the result with the created row (including zone name via JOIN)
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Bus created successfully',
        'createdRow', row_to_json(t)
    )
    INTO v_Result
    FROM (
        SELECT 
            (b.ibus::TEXT || '_' || b."CaseNumber"::TEXT) AS "Id",
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
            b."ZoneCaseNumber",
            0 AS "aclineCount",
            0 AS "transformerCount"
        FROM "Bus" b
        LEFT JOIN "Zone" z ON z.izone = b.zone AND z."CaseNumber" = b."CaseNumber"
        WHERE b.ibus = v_NewBus.ibus 
          AND b."CaseNumber" = v_NewBus."CaseNumber"
    ) t;
    
    RETURN v_Result;
END;
$BODY$;

ALTER FUNCTION public.sp_grid_insert_bus(text, integer)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.sp_grid_insert_bus(text, integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.sp_grid_insert_bus(text, integer) TO postgres;

COMMENT ON FUNCTION public.sp_grid_insert_bus(text, integer)
    IS 'Insert a new bus record. Accepts field values as JSON and user ID. Returns success status and created row data.';
