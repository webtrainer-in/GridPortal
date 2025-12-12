-- =============================================
-- Generate 2000 Sample Employees for Server-Side Pagination Testing
-- Description: Creates 2000 diverse employee records to test server-side pagination mode
-- =============================================

DO $$
DECLARE
    v_DeptId INT;
    v_Counter INT := 1;
    v_FirstNames TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
                                  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
                                  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
                                  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
                                  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah'];
    v_LastNames TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                                 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                                 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
                                 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
                                 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
    v_Departments TEXT[] := ARRAY['IT', 'HR', 'Sales', 'Finance', 'Engineering', 'Operations'];
    v_Locations TEXT[] := ARRAY['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 
                                 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco',
                                 'Indianapolis', 'Seattle', 'Denver', 'Boston'];
    v_Statuses TEXT[] := ARRAY['Active', 'Active', 'Active', 'Active', 'On Leave', 'Inactive'];
    v_Managers TEXT[] := ARRAY['Sarah Johnson', 'Michael Brown', 'Lisa Anderson', 'David Miller', 'Emily White', 'Robert Taylor'];
    
    v_FirstName TEXT;
    v_LastName TEXT;
    v_Email TEXT;
    v_Phone TEXT;
    v_Department TEXT;
    v_Salary DECIMAL;
    v_JoinDate DATE;
    v_Status TEXT;
    v_Location TEXT;
    v_PerformanceRating DECIMAL;
    v_YearsExperience INT;
    v_Manager TEXT;
BEGIN
    -- Loop to create 2000 employees
    WHILE v_Counter <= 2000 LOOP
        -- Generate random data
        v_FirstName := v_FirstNames[1 + floor(random() * 50)::int];
        v_LastName := v_LastNames[1 + floor(random() * 50)::int];
        v_Email := lower(v_FirstName || '.' || v_LastName || '.' || v_Counter || '@company.com');
        v_Phone := '+1-' || (200 + floor(random() * 800)::int) || '-555-' || lpad((1000 + (v_Counter % 9000))::text, 4, '0');
        v_Department := v_Departments[1 + floor(random() * 6)::int];
        v_Salary := (40000 + (random() * 120000))::decimal(10,2);
        v_JoinDate := (CURRENT_DATE - (random() * 3650)::int);
        v_Status := v_Statuses[1 + floor(random() * 6)::int];
        v_Location := v_Locations[1 + floor(random() * 20)::int];
        v_PerformanceRating := (2.0 + (random() * 3.0))::decimal(3,2);
        v_YearsExperience := (1 + floor(random() * 20)::int);
        v_Manager := v_Managers[1 + floor(random() * 6)::int];
        
        -- Get department ID
        SELECT "Id" INTO v_DeptId FROM "Departments" WHERE "Name" = v_Department LIMIT 1;
        
        -- Insert employee
        INSERT INTO "Employees" (
            "FirstName", "LastName", "Email", "Phone", "DepartmentId", "Salary", 
            "JoinDate", "Status", "Location", "PerformanceRating", "YearsExperience", 
            "ReportingManager", "IsActive", "CreatedAt"
        )
        VALUES (
            v_FirstName,
            v_LastName,
            v_Email,
            v_Phone,
            v_DeptId,
            v_Salary,
            v_JoinDate,
            v_Status,
            v_Location,
            v_PerformanceRating,
            v_YearsExperience,
            v_Manager,
            true,
            NOW()
        )
        ON CONFLICT ("Email") DO NOTHING;
        
        -- Progress indicator every 500 records
        IF v_Counter % 500 = 0 THEN
            RAISE NOTICE '⏳ Generated % employees...', v_Counter;
        END IF;
        
        v_Counter := v_Counter + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully generated 2000 employee records!';
END $$;

-- Verify the count
SELECT COUNT(*) as "Total Employees" FROM "Employees";

-- Show distribution by department
SELECT 
    d."Name" as "Department",
    COUNT(*) as "Employee Count"
FROM "Employees" e
JOIN "Departments" d ON e."DepartmentId" = d."Id"
GROUP BY d."Name"
ORDER BY COUNT(*) DESC;
