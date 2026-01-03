-- =============================================
-- PostgreSQL Function: sp_Grid_Delete_Bus
-- Description: Delete a bus record from the Bus table
-- Parameters: p_BusId - Composite key in format "ibus_CaseNumber"
-- Returns: JSONB with success status and message
-- =============================================

CREATE OR REPLACE FUNCTION sp_Grid_Delete_Bus(
    p_BusId TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_Ibus INT;
    v_CaseNumber INT;
    v_Parts TEXT[];
    v_RowCount INT;
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
    
    -- Check if bus exists
    SELECT COUNT(*) INTO v_RowCount
    FROM "Bus"
    WHERE ibus = v_Ibus AND "CaseNumber" = v_CaseNumber;
    
    IF v_RowCount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Bus not found',
            'errorCode', 'NOT_FOUND'
        );
    END IF;
    
    -- Delete the bus
    BEGIN
        DELETE FROM "Bus"
        WHERE ibus = v_Ibus AND "CaseNumber" = v_CaseNumber;
        
        GET DIAGNOSTICS v_RowCount = ROW_COUNT;
        
        IF v_RowCount > 0 THEN
            RETURN jsonb_build_object(
                'success', true,
                'message', 'Bus deleted successfully'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to delete bus',
                'errorCode', 'DELETE_FAILED'
            );
        END IF;
        
    EXCEPTION
        WHEN foreign_key_violation THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Cannot delete bus: referenced by other records',
                'errorCode', 'FOREIGN_KEY_VIOLATION'
            );
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Database error: ' || SQLERRM,
                'errorCode', 'DATABASE_ERROR'
            );
    END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sp_Grid_Delete_Bus(TEXT) TO PUBLIC;
