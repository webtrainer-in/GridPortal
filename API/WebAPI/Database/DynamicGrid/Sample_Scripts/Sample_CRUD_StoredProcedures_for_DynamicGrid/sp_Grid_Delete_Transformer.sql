-- =============================================
-- PostgreSQL Function: sp_Grid_Delete_Bus_Transformers
-- Description: Row-level delete function for Transformer data
-- Parameters: p_TransformerId (composite key format: "ckt_ibus_jbus_kbus_CaseNumber"), p_UserId
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Delete_Bus_Transformers(
    p_TransformerId TEXT,
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
    v_DeleteCount INT := 0;
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
    
    -- Delete Transformer record
    DELETE FROM "Transformer"
    WHERE ckt = v_Ckt
      AND ibus = v_Ibus
      AND jbus = v_Jbus
      AND kbus = v_Kbus
      AND "CaseNumber" = v_CaseNumber;
    
    GET DIAGNOSTICS v_DeleteCount = ROW_COUNT;
    
    IF v_DeleteCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Transformer not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transformer deleted successfully',
        'rowsAffected', v_DeleteCount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error deleting Transformer: ' || SQLERRM,
            'errorCode', 'DELETE_ERROR'
        );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sp_Grid_Delete_Bus_Transformers TO PUBLIC;
