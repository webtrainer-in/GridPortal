-- =============================================
-- PostgreSQL Function: sp_Grid_Update_Bus_Aclines
-- Description: Row-level update function for ACline data
-- Parameters: p_AclineId (composite key format: "ckt_ibus_jbus_CaseNumber"), p_ChangesJson, p_UserId
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Update_Bus_Aclines(
    p_AclineId TEXT,
    p_ChangesJson TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Ckt TEXT;
    v_Ibus INT;
    v_Jbus INT;
    v_CaseNumber INT;
    v_Parts TEXT[];
    v_Name TEXT;
    v_Rpu DECIMAL;
    v_Xpu DECIMAL;
    v_Bpu DECIMAL;
    v_Rate1 DECIMAL;
    v_Rate2 DECIMAL;
    v_Rate3 DECIMAL;
    v_Len DECIMAL;
    v_Stat INT;
    v_UpdateCount INT := 0;
BEGIN
    -- Validate input
    IF p_AclineId IS NULL OR p_AclineId = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'ACline ID is required',
            'errorCode', 'INVALID_INPUT'
        );
    END IF;
    
    -- Parse composite key (format: "ckt_ibus_jbus_CaseNumber")
    v_Parts := string_to_array(p_AclineId, '_');
    
    IF array_length(v_Parts, 1) != 4 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid ACline ID format. Expected: ckt_ibus_jbus_CaseNumber',
            'errorCode', 'INVALID_KEY_FORMAT'
        );
    END IF;
    
    v_Ckt := v_Parts[1];
    v_Ibus := v_Parts[2]::INT;
    v_Jbus := v_Parts[3]::INT;
    v_CaseNumber := v_Parts[4]::INT;
    
    -- Extract changed values from JSON
    IF p_ChangesJson IS NOT NULL AND p_ChangesJson != '' THEN
        v_Name := (p_ChangesJson::jsonb)->>'name';
        v_Rpu := NULLIF((p_ChangesJson::jsonb)->>'rpu', '')::DECIMAL;
        v_Xpu := NULLIF((p_ChangesJson::jsonb)->>'xpu', '')::DECIMAL;
        v_Bpu := NULLIF((p_ChangesJson::jsonb)->>'bpu', '')::DECIMAL;
        v_Rate1 := NULLIF((p_ChangesJson::jsonb)->>'rate1', '')::DECIMAL;
        v_Rate2 := NULLIF((p_ChangesJson::jsonb)->>'rate2', '')::DECIMAL;
        v_Rate3 := NULLIF((p_ChangesJson::jsonb)->>'rate3', '')::DECIMAL;
        v_Len := NULLIF((p_ChangesJson::jsonb)->>'len', '')::DECIMAL;
        v_Stat := NULLIF((p_ChangesJson::jsonb)->>'stat', '')::INT;
    END IF;
    
    -- Update ACline record
    UPDATE "Acline"
    SET 
        name = COALESCE(v_Name, name),
        rpu = COALESCE(v_Rpu, rpu),
        xpu = COALESCE(v_Xpu, xpu),
        bpu = COALESCE(v_Bpu, bpu),
        rate1 = COALESCE(v_Rate1, rate1),
        rate2 = COALESCE(v_Rate2, rate2),
        rate3 = COALESCE(v_Rate3, rate3),
        len = COALESCE(v_Len, len),
        stat = COALESCE(v_Stat, stat)
    WHERE ckt = v_Ckt
      AND ibus = v_Ibus
      AND jbus = v_Jbus
      AND "CaseNumber" = v_CaseNumber;
    
    GET DIAGNOSTICS v_UpdateCount = ROW_COUNT;
    
    IF v_UpdateCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'ACline not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'ACline updated successfully',
        'rowsAffected', v_UpdateCount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error updating ACline: ' || SQLERRM,
            'errorCode', 'UPDATE_ERROR'
        );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sp_Grid_Update_Bus_Aclines TO PUBLIC;
