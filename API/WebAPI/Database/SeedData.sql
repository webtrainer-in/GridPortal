-- =============================================
-- Seed Data Script
-- Description: Insert example departments and employees
-- =============================================

-- Insert Departments
INSERT INTO "Departments" ("Name", "Description", "IsActive", "CreatedAt")
VALUES 
    ('IT', 'Information Technology', true, NOW()),
    ('HR', 'Human Resources', true, NOW()),
    ('Sales', 'Sales and Marketing', true, NOW()),
    ('Finance', 'Finance and Accounting', true, NOW()),
    ('Engineering', 'Engineering and Development', true, NOW()),
    ('Operations', 'Operations and Logistics', true, NOW())
ON CONFLICT DO NOTHING;

-- Insert Example Employees
INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'John', 'Smith', 'john.smith@company.com', '+1-555-0101',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'IT'), 85000.00,
    '2020-01-15'::date, 'Active', 'New York', 4.5, 5, 'Sarah Johnson', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'john.smith@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Jane', 'Doe', 'jane.doe@company.com', '+1-555-0102',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'HR'), 75000.00,
    '2019-03-20'::date, 'Active', 'Los Angeles', 4.8, 6, 'Michael Brown', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'jane.doe@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Bob', 'Wilson', 'bob.wilson@company.com', '+1-555-0103',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Sales'), 90000.00,
    '2018-07-10'::date, 'Active', 'Chicago', 4.2, 7, 'Lisa Anderson', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'bob.wilson@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Alice', 'Brown', 'alice.brown@company.com', '+1-555-0104',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Finance'), 95000.00,
    '2017-11-05'::date, 'Active', 'Boston', 4.7, 8, 'David Miller', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'alice.brown@company.com');

INSERT INTO "Employees" (
    "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
    "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
    "ReportingManager", "IsActive", "CreatedAt"
)
SELECT 
    'Charlie', 'Davis', 'charlie.davis@company.com', '+1-555-0105',
    (SELECT "Id" FROM "Departments" WHERE "Name" = 'Engineering'), 110000.00,
    '2021-02-28'::date, 'Active', 'San Francisco', 4.9, 4, 'Emily White', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Employees" WHERE "Email" = 'charlie.davis@company.com');

-- Insert Stored Procedure Registry Entry
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Description", "Category", "IsActive", 
    "RequiresAuth", "AllowedRoles", "DefaultPageSize", "MaxPageSize", "CreatedAt"
)
VALUES (
    'sp_Grid_Example_Employees',
    'Example Employees',
    'Demo employee grid with department information',
    'HR',
    true,
    true,
    '["Admin", "Manager", "User"]',
    15,
    1000,
    NOW()
)
ON CONFLICT ("ProcedureName") DO NOTHING;
