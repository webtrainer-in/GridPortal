# PostgreSQL Database Setup Script
# Run this script to create stored procedures and seed data

# Set connection string
$connectionString = "Host=localhost;Port=5432;Database=GridPortalDb;Username=postgres;Password=pass@12345"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to execute SQL file
function Execute-SqlFile {
    param (
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host "Executing: $Description" -ForegroundColor Yellow
    
    try {
        $env:PGPASSWORD = "pass@12345"
        psql -h localhost -p 5432 -U postgres -d GridPortalDb -f $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Success: $Description" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $Description" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    return $true
}

# Execute stored procedures
Write-Host "Step 1: Creating Stored Procedures..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

$sp1 = Execute-SqlFile -FilePath ".\Database\StoredProcedures\sp_Grid_Example_Employees.sql" -Description "sp_Grid_Example_Employees"
$sp2 = Execute-SqlFile -FilePath ".\Database\StoredProcedures\sp_Grid_Update_Example_Employees.sql" -Description "sp_Grid_Update_Example_Employees"

if (-not $sp1 -or -not $sp2) {
    Write-Host "Failed to create stored procedures. Exiting..." -ForegroundColor Red
    exit 1
}

# Seed data
Write-Host "Step 2: Seeding Data..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

$seed = Execute-SqlFile -FilePath ".\Database\SeedData.sql" -Description "Seed Departments, Employees, and Registry"

if (-not $seed) {
    Write-Host "Failed to seed data. Exiting..." -ForegroundColor Red
    exit 1
}

# Verify setup
Write-Host "Step 3: Verifying Setup..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Cyan

Write-Host "Checking stored procedures..." -ForegroundColor Yellow
$env:PGPASSWORD = "pass@12345"
$functions = psql -h localhost -p 5432 -U postgres -d GridPortalDb -t -c "SELECT proname FROM pg_proc WHERE proname LIKE 'sp_grid%';"

if ($functions -match "sp_grid_example_employees") {
    Write-Host "✓ sp_Grid_Example_Employees exists" -ForegroundColor Green
} else {
    Write-Host "✗ sp_Grid_Example_Employees not found" -ForegroundColor Red
}

if ($functions -match "sp_grid_update_example_employees") {
    Write-Host "✓ sp_Grid_Update_Example_Employees exists" -ForegroundColor Green
} else {
    Write-Host "✗ sp_Grid_Update_Example_Employees not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking data..." -ForegroundColor Yellow
$deptCount = psql -h localhost -p 5432 -U postgres -d GridPortalDb -t -c 'SELECT COUNT(*) FROM "Departments";'
$empCount = psql -h localhost -p 5432 -U postgres -d GridPortalDb -t -c 'SELECT COUNT(*) FROM "Employees";'
$regCount = psql -h localhost -p 5432 -U postgres -d GridPortalDb -t -c 'SELECT COUNT(*) FROM "StoredProcedureRegistry";'

Write-Host "✓ Departments: $($deptCount.Trim())" -ForegroundColor Green
Write-Host "✓ Employees: $($empCount.Trim())" -ForegroundColor Green
Write-Host "✓ Registry Entries: $($regCount.Trim())" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the function: SELECT * FROM sp_Grid_Example_Employees(1, 15, NULL, NULL, NULL, 'ASC', NULL, NULL);" -ForegroundColor White
Write-Host "2. Proceed to Phase 2: Backend Services & API" -ForegroundColor White
Write-Host ""
