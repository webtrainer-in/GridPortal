-- =============================================
-- PostgreSQL Function: sp_Grid_Update_Bus
-- Description: Row-level update function for bus data
-- Parameters: p_BusId (composite key format: "ibus_CaseNumber"), p_ChangesJson, p_UserId
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Update_Bus(
    p_BusId TEXT,
    p_ChangesJson TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Ibus INT;
    v_CaseNumber INT;
    v_Parts TEXT[];
    v_Name TEXT;
    v_BaseKV DECIMAL;
    v_Area INT;
    v_Zone INT;
    v_Owner INT;
    v_IDE INT;
    v_VM DECIMAL;
    v_VA DECIMAL;
    v_NVHi DECIMAL;
    v_NVLo DECIMAL;
    v_EVHi DECIMAL;
    v_EVLo DECIMAL;
    v_Izone INT;
    v_AreaCaseNumber INT;
    v_OwnerCaseNumber INT;
    v_ZoneCaseNumber INT;
    v_UpdateCount INT := 0;
BEGIN
    -- Validate input
    IF p_BusId IS NULL OR p_BusId = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Bus ID is required',
            'errorCode', 'INVALID_INPUT'
        );
    END IF;
    
    -- Parse composite key (format: "ibus_CaseNumber")
    v_Parts := string_to_array(p_BusId, '_');
    
    IF array_length(v_Parts, 1) != 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid Bus ID format. Expected format: ibus_CaseNumber',
            'errorCode', 'INVALID_FORMAT'
        );
    END IF;
    
    -- Extract ibus and CaseNumber
    BEGIN
        v_Ibus := v_Parts[1]::INT;
        v_CaseNumber := v_Parts[2]::INT;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid Bus ID values. Both ibus and CaseNumber must be integers',
            'errorCode', 'INVALID_TYPE'
        );
    END;
    
    -- Parse JSON changes
    v_Name := (p_ChangesJson::jsonb)->>'name';
    v_BaseKV := ((p_ChangesJson::jsonb)->>'baskv')::DECIMAL;
    v_Area := ((p_ChangesJson::jsonb)->>'iarea')::INT;
    v_Zone := ((p_ChangesJson::jsonb)->>'zone')::INT;
    v_Owner := ((p_ChangesJson::jsonb)->>'iowner')::INT;
    v_IDE := ((p_ChangesJson::jsonb)->>'ide')::INT;
    v_VM := ((p_ChangesJson::jsonb)->>'vm')::DECIMAL;
    v_VA := ((p_ChangesJson::jsonb)->>'va')::DECIMAL;
    v_NVHi := ((p_ChangesJson::jsonb)->>'nvhi')::DECIMAL;
    v_NVLo := ((p_ChangesJson::jsonb)->>'nvlo')::DECIMAL;
    v_EVHi := ((p_ChangesJson::jsonb)->>'evhi')::DECIMAL;
    v_EVLo := ((p_ChangesJson::jsonb)->>'evlo')::DECIMAL;
    v_Izone := ((p_ChangesJson::jsonb)->>'Izone')::INT;
    v_AreaCaseNumber := ((p_ChangesJson::jsonb)->>'AreaCaseNumber')::INT;
    v_OwnerCaseNumber := ((p_ChangesJson::jsonb)->>'OwnerCaseNumber')::INT;
    v_ZoneCaseNumber := ((p_ChangesJson::jsonb)->>'ZoneCaseNumber')::INT;
    
    -- Validate BaseKV if provided
    IF v_BaseKV IS NOT NULL AND (v_BaseKV < 0 OR v_BaseKV > 1000) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Base KV must be between 0 and 1000'
        );
    END IF;
    
    -- Validate voltage limits if provided
    IF v_NVHi IS NOT NULL AND v_NVLo IS NOT NULL AND v_NVHi < v_NVLo THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Normal voltage high must be greater than normal voltage low'
        );
    END IF;
    
    IF v_EVHi IS NOT NULL AND v_EVLo IS NOT NULL AND v_EVHi < v_EVLo THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Emergency voltage high must be greater than emergency voltage low'
        );
    END IF;
    
    -- Perform update
    UPDATE "Bus"
    SET 
        name = COALESCE(v_Name, name),
        baskv = COALESCE(v_BaseKV, baskv),
        iarea = COALESCE(v_Area, iarea),
        zone = COALESCE(v_Zone, zone),
        iowner = COALESCE(v_Owner, iowner),
        ide = COALESCE(v_IDE, ide),
        vm = COALESCE(v_VM, vm),
        va = COALESCE(v_VA, va),
        nvhi = COALESCE(v_NVHi, nvhi),
        nvlo = COALESCE(v_NVLo, nvlo),
        evhi = COALESCE(v_EVHi, evhi),
        evlo = COALESCE(v_EVLo, evlo),
        "Izone" = COALESCE(v_Izone, "Izone"),
        "AreaCaseNumber" = COALESCE(v_AreaCaseNumber, "AreaCaseNumber"),
        "OwnerCaseNumber" = COALESCE(v_OwnerCaseNumber, "OwnerCaseNumber"),
        "ZoneCaseNumber" = COALESCE(v_ZoneCaseNumber, "ZoneCaseNumber")
    WHERE ibus = v_Ibus AND "CaseNumber" = v_CaseNumber;
    
    GET DIAGNOSTICS v_UpdateCount = ROW_COUNT;
    
    IF v_UpdateCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Bus not found with ID: ' || p_BusId
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Bus updated successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sp_Grid_Update_Bus(TEXT, TEXT, INT) TO PUBLIC;
