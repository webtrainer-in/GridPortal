-- =============================================
-- PostgreSQL Function: sp_Grid_Delete_Bus_Aclines
-- Description: Row-level delete function for ACline data
-- Parameters: p_AclineId (composite key format: "ckt_ibus_jbus_CaseNumber"), p_UserId
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Delete_Bus_Aclines(
    p_AclineId TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
DECLARE
    v_Ckt TEXT;
    v_Ibus INT;
    v_Jbus INT;
    v_CaseNumber INT;
    v_Parts TEXT[];
    v_DeleteCount INT := 0;
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
    
    -- Delete ACline record
    DELETE FROM "Acline"
    WHERE ckt = v_Ckt
      AND ibus = v_Ibus
      AND jbus = v_Jbus
      AND "CaseNumber" = v_CaseNumber;
    
    GET DIAGNOSTICS v_DeleteCount = ROW_COUNT;
    
    IF v_DeleteCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'ACline not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'ACline deleted successfully',
        'rowsAffected', v_DeleteCount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error deleting ACline: ' || SQLERRM,
            'errorCode', 'DELETE_ERROR'
        );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sp_Grid_Delete_Bus_Aclines TO PUBLIC;
