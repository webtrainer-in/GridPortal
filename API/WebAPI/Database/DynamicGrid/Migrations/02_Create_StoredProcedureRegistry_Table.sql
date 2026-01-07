-- =============================================
-- StoredProcedureRegistry Table Creation
-- Run this on your DEFAULT/CENTRAL database
-- This table stores metadata for all dynamic grid procedures
-- =============================================

-- Create StoredProcedureRegistry table
CREATE TABLE IF NOT EXISTS "StoredProcedureRegistry" (
    "Id" SERIAL PRIMARY KEY,
    "ProcedureName" VARCHAR(200) NOT NULL,
    "DisplayName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "ClientId" INTEGER, -- For multi-tenant scenarios
    "Category" VARCHAR(50), -- e.g., "HR", "Finance", "Sales"
    "IsActive" BOOLEAN DEFAULT true NOT NULL,
    "RequiresAuth" BOOLEAN DEFAULT true NOT NULL,
    "AllowedRoles" TEXT DEFAULT '[]' NOT NULL, -- JSON array: ["Admin", "Manager"]
    "CacheDurationSeconds" INTEGER, -- Optional caching
    "DefaultPageSize" INTEGER DEFAULT 15 NOT NULL,
    "MaxPageSize" INTEGER DEFAULT 1000 NOT NULL,
    "DatabaseName" VARCHAR(100), -- Database identifier for routing procedure calls
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP,
    "CreatedBy" INTEGER,
    "UpdatedBy" INTEGER,
    CONSTRAINT "UQ_StoredProcedureRegistry_ProcedureName" UNIQUE ("ProcedureName")
);

-- Add column comment for DatabaseName
COMMENT ON COLUMN "StoredProcedureRegistry"."DatabaseName" IS 
'Database identifier for routing procedure calls. Maps to connection string names in appsettings.json. If null, uses DefaultConnection. Examples: "PowerSystem", "HR", "Finance"';

-- Add column comment for AllowedRoles
COMMENT ON COLUMN "StoredProcedureRegistry"."AllowedRoles" IS 
'JSON array of role names that can access this procedure. Example: ["Admin", "Manager", "User"]';

-- Add column comment for Category
COMMENT ON COLUMN "StoredProcedureRegistry"."Category" IS 
'Logical grouping for procedures. Examples: "HR", "Finance", "Sales", "PowerSystem"';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_StoredProcedureRegistry_ProcedureName" 
ON "StoredProcedureRegistry" ("ProcedureName");

CREATE INDEX IF NOT EXISTS "IDX_StoredProcedureRegistry_Category_IsActive" 
ON "StoredProcedureRegistry" ("Category", "IsActive");

CREATE INDEX IF NOT EXISTS "IDX_StoredProcedureRegistry_DatabaseName" 
ON "StoredProcedureRegistry" ("DatabaseName")
WHERE "DatabaseName" IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'StoredProcedureRegistry table created successfully!';
END $$;
