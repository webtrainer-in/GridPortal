-- =============================================
-- PostgreSQL Function: sp_Grid_Update_Bus_Transformers
-- Description: Row-level update function for Transformer data
-- Parameters: p_TransformerId (composite key format: "ckt_ibus_jbus_kbus_CaseNumber"), p_ChangesJson, p_UserId
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Update_Bus_Transformers(
    p_TransformerId TEXT,
    p_ChangesJson TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Ckt TEXT;
    v_Ibus INT;
    v_Jbus INT;
    v_Kbus INT;
    v_CaseNumber INT;
    v_Parts TEXT[];
    v_Name TEXT;
    v_R1_2 DECIMAL;
    v_X1_2 DECIMAL;
    v_Sbase1_2 DECIMAL;
    v_Windv1 DECIMAL;
    v_Windv2 DECIMAL;
    v_Ang1 DECIMAL;
    v_Nomv1 DECIMAL;
    v_Nomv2 DECIMAL;
    v_Stat INT;
    v_UpdateCount INT := 0;
BEGIN
    -- Validate input
    IF p_TransformerId IS NULL OR p_TransformerId = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transformer ID is required',
            'errorCode', 'INVALID_INPUT'
        );
    END IF;
    
    -- Parse composite key (format: "ckt_ibus_jbus_kbus_CaseNumber")
    v_Parts := string_to_array(p_TransformerId, '_');
    
    IF array_length(v_Parts, 1) != 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid Transformer ID format. Expected: ckt_ibus_jbus_kbus_CaseNumber',
            'errorCode', 'INVALID_KEY_FORMAT'
        );
    END IF;
    
    v_Ckt := v_Parts[1];
    v_Ibus := v_Parts[2]::INT;
    v_Jbus := v_Parts[3]::INT;
    v_Kbus := v_Parts[4]::INT;
    v_CaseNumber := v_Parts[5]::INT;
    
    -- Extract changed values from JSON
    IF p_ChangesJson IS NOT NULL AND p_ChangesJson != '' THEN
        v_Name := (p_ChangesJson::jsonb)->>'name';
        v_R1_2 := NULLIF((p_ChangesJson::jsonb)->>'r1_2', '')::DECIMAL;
        v_X1_2 := NULLIF((p_ChangesJson::jsonb)->>'x1_2', '')::DECIMAL;
        v_Sbase1_2 := NULLIF((p_ChangesJson::jsonb)->>'sbase1_2', '')::DECIMAL;
        v_Windv1 := NULLIF((p_ChangesJson::jsonb)->>'windv1', '')::DECIMAL;
        v_Windv2 := NULLIF((p_ChangesJson::jsonb)->>'windv2', '')::DECIMAL;
        v_Ang1 := NULLIF((p_ChangesJson::jsonb)->>'ang1', '')::DECIMAL;
        v_Nomv1 := NULLIF((p_ChangesJson::jsonb)->>'nomv1', '')::DECIMAL;
        v_Nomv2 := NULLIF((p_ChangesJson::jsonb)->>'nomv2', '')::DECIMAL;
        v_Stat := NULLIF((p_ChangesJson::jsonb)->>'stat', '')::INT;
    END IF;
    
    -- Update Transformer record
    UPDATE "Transformer"
    SET 
        name = COALESCE(v_Name, name),
        r1_2 = COALESCE(v_R1_2, r1_2),
        x1_2 = COALESCE(v_X1_2, x1_2),
        sbase1_2 = COALESCE(v_Sbase1_2, sbase1_2),
        windv1 = COALESCE(v_Windv1, windv1),
        windv2 = COALESCE(v_Windv2, windv2),
        ang1 = COALESCE(v_Ang1, ang1),
        nomv1 = COALESCE(v_Nomv1, nomv1),
        nomv2 = COALESCE(v_Nomv2, nomv2),
        stat = COALESCE(v_Stat, stat)
    WHERE ckt = v_Ckt
      AND ibus = v_Ibus
      AND jbus = v_Jbus
      AND kbus = v_Kbus
      AND "CaseNumber" = v_CaseNumber;
    
    GET DIAGNOSTICS v_UpdateCount = ROW_COUNT;
    
    IF v_UpdateCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transformer not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transformer updated successfully',
        'rowsAffected', v_UpdateCount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error updating Transformer: ' || SQLERRM,
            'errorCode', 'UPDATE_ERROR'
        );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sp_Grid_Update_Bus_Transformers TO PUBLIC;
