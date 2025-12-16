-- =============================================
-- Cascading Dropdown - ADAPTED FOR EXISTING SCHEMA (PostgreSQL)
-- Run this on Employee database
-- =============================================

-- 1. Create Groups table (doesn't exist yet)
CREATE TABLE IF NOT EXISTS "Groups" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Code" VARCHAR(20) NOT NULL UNIQUE,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add GroupId to existing Departments table
ALTER TABLE "Departments" ADD COLUMN IF NOT EXISTS "GroupId" INTEGER;

-- 3. Add foreign key constraint
ALTER TABLE "Departments" ADD CONSTRAINT "FK_Departments_Groups" 
    FOREIGN KEY ("GroupId") REFERENCES "Groups"("Id");

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS "IX_Departments_GroupId" 
    ON "Departments"("GroupId") WHERE "IsActive" = true;

-- 5. Add GroupId to Employees table
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "GroupId" INTEGER;

-- 6. Add foreign key constraint (optional)
ALTER TABLE "Employees" ADD CONSTRAINT "FK_Employees_Groups" 
    FOREIGN KEY ("GroupId") REFERENCES "Groups"("Id");

-- =============================================
-- Sample Data
-- =============================================

-- Insert Groups
INSERT INTO "Groups" ("Name", "Code", "Description") VALUES
('Engineering Group', 'ENG', 'Engineering and Technical Teams'),
('Business Group', 'BUS', 'Business Operations and Support'),
('Corporate Group', 'CORP', 'Corporate Functions');

-- Update existing Departments with GroupId
-- You'll need to assign each department to a group
-- Example assignments (adjust based on your actual departments):
UPDATE "Departments" SET "GroupId" = 1 
WHERE "Name" ILIKE '%Engineering%' OR "Name" ILIKE '%QA%' OR "Name" ILIKE '%DevOps%';

UPDATE "Departments" SET "GroupId" = 2 
WHERE "Name" ILIKE '%Sales%' OR "Name" ILIKE '%Marketing%' OR "Name" ILIKE '%Support%';

UPDATE "Departments" SET "GroupId" = 3 
WHERE "Name" ILIKE '%HR%' OR "Name" ILIKE '%Finance%' OR "Name" ILIKE '%Legal%';

-- If you want to manually assign, comment out above and use:
-- UPDATE "Departments" SET "GroupId" = 1 WHERE "Id" = 1;

-- =============================================
-- Verification Queries
-- =============================================

-- Check Groups
SELECT * FROM "Groups";

-- Check Departments with Groups
SELECT d."Id", d."Name", d."GroupId", g."Name" as "GroupName"
FROM "Departments" d
LEFT JOIN "Groups" g ON d."GroupId" = g."Id";

-- Check Employees table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Employees' 
  AND column_name IN ('Status', 'GroupId', 'DepartmentId');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Schema updated successfully!';
    RAISE NOTICE 'Created: Groups table';
    RAISE NOTICE 'Modified: Departments table (added GroupId)';
    RAISE NOTICE 'Modified: Employees table (added GroupId)';
END $$;
