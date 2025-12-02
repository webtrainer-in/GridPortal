# Database Setup Script
# Run this script after configuring your PostgreSQL connection string

Write-Host "GridPortal API - Database Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check if dotnet-ef tools are installed
Write-Host "Checking for EF Core tools..." -ForegroundColor Yellow
$efToolsInstalled = dotnet tool list --global | Select-String "dotnet-ef"

if (-not $efToolsInstalled) {
    Write-Host "Installing EF Core tools..." -ForegroundColor Yellow
    dotnet tool install --global dotnet-ef
}
else {
    Write-Host "EF Core tools already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Creating initial migration..." -ForegroundColor Yellow
dotnet ef migrations add InitialCreate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Applying migration to database..." -ForegroundColor Yellow
    dotnet ef database update
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Database setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run the API with:" -ForegroundColor Cyan
        Write-Host "  dotnet run" -ForegroundColor White
    }
    else {
        Write-Host ""
        Write-Host "Error applying migrations. Please check your connection string." -ForegroundColor Red
    }
}
else {
    Write-Host ""
    Write-Host "Error creating migration." -ForegroundColor Red
}
