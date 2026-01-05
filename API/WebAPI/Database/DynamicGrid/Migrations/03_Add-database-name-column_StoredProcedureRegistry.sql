-- =============================================
-- Add DatabaseName Column to StoredProcedureRegistry
-- Purpose: Enable multi-database support for dynamic grid procedures
-- =============================================

-- Add DatabaseName column
ALTER TABLE "StoredProcedureRegistry"
ADD COLUMN "DatabaseName" VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN "StoredProcedureRegistry"."DatabaseName" IS 
'Database identifier for routing procedure calls. Maps to connection string names in appsettings.json. If null, uses DefaultConnection.';

-- Create index for performance
CREATE INDEX idx_storedprocedureregistry_databasename 
ON "StoredProcedureRegistry"("DatabaseName")
WHERE "DatabaseName" IS NOT NULL;
