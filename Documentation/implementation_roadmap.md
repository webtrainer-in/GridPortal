# Dynamic Grid Framework - Implementation Roadmap

## 📚 Complete Documentation Reference

### **Planning & Architecture Documents**
1. **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)** - Master technical specification
2. **[architecture_diagram.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/architecture_diagram.md)** - Visual architecture & data flows
3. **[executive_summary.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/executive_summary.md)** - Business overview & use cases

### **Technical Implementation Guides**
4. **[stored_procedures_reference.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/stored_procedures_reference.md)** - Entity Framework Core SP patterns
5. **[inline_editing_infinite_scroll_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/inline_editing_infinite_scroll_guide.md)** - Technical foundation for advanced features
6. **[row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)** - Row-level editing with Edit/Save buttons
7. **[column_grouping_visibility_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/column_grouping_visibility_guide.md)** - Column organization & visibility controls

### **Task Tracking**
8. **[task.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/task.md)** - Implementation checklist

---

## 🗺️ Phase-Wise Implementation Guide

---

## **Phase 1: Database Schema & Stored Procedures**

### **Objective**
Set up database tables, stored procedure registry, and create template stored procedures.

### **Primary Documentation**
- **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)** - Section: "Database Schema"
- **[stored_procedures_reference.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/stored_procedures_reference.md)** - Complete SP patterns
- **[architecture_diagram.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/architecture_diagram.md)** - Database layer visualization

### **Implementation Steps**

#### 1.1 Create Database Tables
**Reference:** implementation_plan.md → "Database Schema" section

**Tables to Create:**
```sql
✓ StoredProcedureRegistry
✓ GridColumnState (for user preferences)
✓ Example: Employees table (for demo)
✓ Example: Departments table (for demo)
```

**Files to Create:**
- `API/WebAPI/Database/Migrations/AddStoredProcedureRegistry.sql`
- `API/WebAPI/Database/Migrations/AddGridColumnState.sql`
- `API/WebAPI/Database/Migrations/AddExampleTables.sql`

#### 1.2 Create Entity Models
**Reference:** implementation_plan.md → "Phase 1: Backend - Database & Models"

**Files to Create:**
- `API/WebAPI/Models/StoredProcedureRegistry.cs`
- `API/WebAPI/Models/GridColumnState.cs`
- `API/WebAPI/Models/Department.cs` (example)
- `API/WebAPI/Models/Employee.cs` (example)

#### 1.3 Update DbContext
**Reference:** implementation_plan.md → "Phase 1.2 Update DbContext"

**File to Modify:**
- `API/WebAPI/Data/ApplicationDbContext.cs`
  - Add DbSets for new tables
  - Configure entity relationships
  - Add indexes

#### 1.4 Create Stored Procedures
**Reference:** 
- **stored_procedures_reference.md** - SP patterns and best practices
- **row_level_editing_guide.md** → "Stored Procedure - Row-Level Update"
- **inline_editing_infinite_scroll_guide.md** → "Updated Stored Procedure Template"

**Files to Create:**
- `API/WebAPI/Database/StoredProcedures/sp_Grid_Template.sql` (template for clients)
- `API/WebAPI/Database/StoredProcedures/sp_Grid_Example_Employees.sql` (demo)
- `API/WebAPI/Database/StoredProcedures/sp_Grid_Update_Example_Employees.sql` (demo)

**Key Features:**
- Standard input parameters (PageNumber, PageSize, StartRow, EndRow, etc.)
- Three result sets (Data, Column Metadata, Total Count)
- Support for infinite scrolling
- Column grouping metadata
- Editable column flags

#### 1.5 Run Migrations
**Commands:**
```bash
cd API/WebAPI
dotnet ef migrations add AddDynamicGridInfrastructure
dotnet ef database update
```

**Then execute stored procedures:**
```powershell
# Run SQL scripts to create stored procedures
.\Database\apply-stored-procedures.ps1
```

#### 1.6 Seed Registry Data
**Reference:** implementation_plan.md → "Client Onboarding Process"

**Register example stored procedure:**
```sql
INSERT INTO StoredProcedureRegistry 
(ProcedureName, DisplayName, Description, Category, AllowedRoles, IsActive, RequiresAuth)
VALUES 
('sp_Grid_Example_Employees', 'Example Employees', 'Demo employee grid', 
 'HR', '["Admin", "Manager", "User"]', 1, 1);
```

### **Verification Checklist**
- [ ] All tables created successfully
- [ ] Entity models compile without errors
- [ ] DbContext includes all DbSets
- [ ] Migrations applied successfully
- [ ] Stored procedures created in database
- [ ] Registry contains at least one example procedure
- [ ] Can query StoredProcedureRegistry table

---

## **Phase 2: Backend Services & API**

### **Objective**
Implement service layer, API controllers, and DTOs for dynamic grid operations.

### **Primary Documentation**
- **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)** - Sections: "Phase 2: Backend - DTOs & Service Layer", "Phase 3: Backend - API Controller"
- **[stored_procedures_reference.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/stored_procedures_reference.md)** - Service implementation patterns
- **[row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)** - Backend DTOs and service methods

### **Implementation Steps**

#### 2.1 Create DTOs
**Reference:** implementation_plan.md → "Phase 2.1 Create DTOs"

**Files to Create:**
- `API/WebAPI/DTOs/GridDataRequest.cs`
- `API/WebAPI/DTOs/GridDataResponse.cs`
- `API/WebAPI/DTOs/ColumnDefinition.cs`
- `API/WebAPI/DTOs/RowUpdateRequest.cs` (for row-level editing)
- `API/WebAPI/DTOs/RowUpdateResponse.cs` (for row-level editing)
- `API/WebAPI/DTOs/StoredProcedureInfo.cs`

**Key Features:**
- Support for both pagination modes (traditional + infinite scrolling)
- Column grouping metadata
- Editable column flags
- Row-level update with changes dictionary

#### 2.2 Create Service Interface
**Reference:** implementation_plan.md → "Phase 2.2 Create Service Interface & Implementation"

**File to Create:**
- `API/WebAPI/Services/IDynamicGridService.cs`

**Methods:**
```csharp
Task<GridDataResponse> ExecuteGridProcedureAsync(GridDataRequest request, string[] userRoles);
Task<RowUpdateResponse> UpdateRowAsync(RowUpdateRequest request, string[] userRoles, int userId);
Task<List<StoredProcedureInfo>> GetAvailableProceduresAsync(string[] userRoles);
Task<bool> ValidateProcedureAccessAsync(string procedureName, string[] userRoles);
Task<string?> GetColumnStateAsync(int userId, string procedureName);
Task SaveColumnStateAsync(int userId, string procedureName, string columnState);
```

#### 2.3 Implement Service
**Reference:** 
- **implementation_plan.md** → "Phase 2.2 Create Service Interface & Implementation"
- **stored_procedures_reference.md** → Complete service examples
- **row_level_editing_guide.md** → "Backend - Service Method"

**File to Create:**
- `API/WebAPI/Services/DynamicGridService.cs`

**Key Implementation:**
- Execute stored procedures with `SqlQueryRaw`
- Read multiple result sets (Data, Columns, Count)
- Handle OUTPUT parameters
- Validate procedure access
- Parse dynamic rows and column definitions
- Row-level update logic

#### 2.4 Create API Controller
**Reference:** 
- **implementation_plan.md** → "Phase 3: Backend - API Controller"
- **row_level_editing_guide.md** → "Backend - API Controller"

**File to Create:**
- `API/WebAPI/Controllers/DynamicGridController.cs`

**Endpoints:**
```csharp
[HttpPost("execute")]           // Execute grid stored procedure
[HttpPost("update-row")]        // Update entire row
[HttpGet("available-procedures")] // Get procedures user can access
[HttpGet("column-state/{procedureName}")] // Get saved column state
[HttpPost("column-state")]      // Save column state
```

**Features:**
- JWT authentication required
- Extract user roles from claims
- Proper error handling
- Logging

#### 2.5 Register Services in DI
**Reference:** implementation_plan.md → "Phase 3.2 Register Service in DI Container"

**File to Modify:**
- `API/WebAPI/Program.cs`

**Add:**
```csharp
builder.Services.AddScoped<IDynamicGridService, DynamicGridService>();
```

### **Verification Checklist**
- [ ] All DTOs compile successfully
- [ ] Service interface defined
- [ ] Service implementation complete
- [ ] Controller endpoints created
- [ ] Service registered in DI container
- [ ] Can build API project without errors
- [ ] Swagger shows all endpoints
- [ ] Can test `/available-procedures` endpoint

---

## **Phase 3: Frontend Components & Services**

### **Objective**
Create Angular services and components for dynamic grid with all features.

### **Primary Documentation**
- **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)** - Sections: "Phase 4: Frontend - Service Layer", "Phase 5: Frontend - Component Integration"
- **[inline_editing_infinite_scroll_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/inline_editing_infinite_scroll_guide.md)** - AG Grid configuration
- **[row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)** - Complete frontend implementation
- **[column_grouping_visibility_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/column_grouping_visibility_guide.md)** - Column panel setup

### **Implementation Steps**

#### 3.1 Create Dynamic Grid Service
**Reference:** 
- **implementation_plan.md** → "Phase 4.1 Create Employee Service"
- **row_level_editing_guide.md** → "Frontend - Column Definitions"

**File to Create:**
- `Frontend/src/core/services/dynamic-grid.service.ts`

**Methods:**
```typescript
executeGridProcedure(request: GridDataRequest): Observable<GridDataResponse>
updateRow(request: RowUpdateRequest): Observable<RowUpdateResponse>
getAvailableProcedures(): Observable<StoredProcedureInfo[]>
getColumnState(procedureName: string): Observable<string>
saveColumnState(request: SaveColumnStateRequest): Observable<any>
```

#### 3.2 Create Action Buttons Cell Renderer
**Reference:** row_level_editing_guide.md → "Action Buttons Cell Renderer"

**File to Create:**
- `Frontend/src/shared/components/dynamic-grid/action-buttons-renderer.component.ts`

**Features:**
- Edit button (view mode)
- Save & Cancel buttons (edit mode)
- Click handlers
- Styling

#### 3.3 Update Dynamic Grid Component
**Reference:** 
- **row_level_editing_guide.md** → "Frontend - Column Definitions"
- **inline_editing_infinite_scroll_guide.md** → "Configure AG Grid for Server-Side Row Model"
- **column_grouping_visibility_guide.md** → "Frontend - Column Definitions"

**File to Modify:**
- `Frontend/src/shared/components/dynamic-grid/dynamic-grid.ts`

**Features:**
- Server-Side Row Model for infinite scrolling
- Column grouping logic
- Row edit state management
- Edit/Save/Cancel handlers
- Column visibility controls
- Side bar with column panel
- Row styling for edit mode

#### 3.4 Create/Update Demo Component
**Reference:** implementation_plan.md → "Phase 5: Frontend - Component Integration"

**File to Modify:**
- `Frontend/src/shared/components/dynamic-grid/dynamic-grid-demo.ts`

**Features:**
- Procedure selector dropdown
- Load available procedures
- Pass selected procedure to grid
- Search functionality

#### 3.5 Optional: Custom Column Visibility Panel
**Reference:** column_grouping_visibility_guide.md → "Custom Column Visibility UI"

**File to Create (Optional):**
- `Frontend/src/shared/components/dynamic-grid/column-visibility-panel.component.ts`

**Features:**
- Group-based column list
- Show/hide checkboxes
- Search functionality
- Expand/collapse groups

### **Verification Checklist**
- [ ] Dynamic grid service created
- [ ] Action buttons renderer component created
- [ ] Dynamic grid component updated
- [ ] Demo component updated
- [ ] All TypeScript compiles without errors
- [ ] Can run `ng serve` successfully
- [ ] Grid displays in browser
- [ ] Can select different procedures from dropdown

---

## **Phase 4: Testing & Verification**

### **Objective**
End-to-end testing of all features and verification of functionality.

### **Primary Documentation**
- **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)** - Section: "Verification Plan"
- **[row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)** - Testing scenarios
- **[executive_summary.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/executive_summary.md)** - Success metrics

### **Testing Steps**

#### 4.1 Backend API Testing
**Reference:** implementation_plan.md → "Verification Plan → Backend Testing"

**Test Cases:**
- [ ] **Authentication**
  - Test with valid JWT token
  - Test with invalid/expired token
  - Test without token (should return 401)

- [ ] **Available Procedures Endpoint**
  - GET `/api/DynamicGrid/available-procedures`
  - Verify returns only procedures user has access to
  - Verify role-based filtering works

- [ ] **Execute Grid Procedure**
  - POST `/api/DynamicGrid/execute`
  - Test with valid procedure name
  - Test with invalid procedure name
  - Test pagination (traditional mode)
  - Test infinite scrolling (startRow/endRow)
  - Test sorting
  - Test filtering
  - Verify response structure

- [ ] **Update Row**
  - POST `/api/DynamicGrid/update-row`
  - Test valid update
  - Test validation errors
  - Test unauthorized update
  - Test concurrent updates

- [ ] **Column State**
  - GET `/api/DynamicGrid/column-state/{procedureName}`
  - POST `/api/DynamicGrid/column-state`
  - Verify state persists per user

**Tools:** Postman, Thunder Client, or Swagger UI

#### 4.2 Stored Procedure Testing
**Reference:** stored_procedures_reference.md → "Testing Stored Procedures"

**Test Cases:**
- [ ] Execute `sp_Grid_Example_Employees` directly in SQL
- [ ] Verify returns 3 result sets
- [ ] Test pagination parameters
- [ ] Test infinite scrolling parameters
- [ ] Test sorting
- [ ] Test filtering
- [ ] Verify column metadata includes all fields
- [ ] Test `sp_Grid_Update_Example_Employees`
- [ ] Verify validation logic
- [ ] Verify transaction rollback on error

#### 4.3 Frontend Feature Testing
**Reference:** 
- **row_level_editing_guide.md** → Complete workflow
- **inline_editing_infinite_scroll_guide.md** → Testing checklist
- **column_grouping_visibility_guide.md** → Features

**Test Cases:**

**Infinite Scrolling:**
- [ ] Grid loads initial block of data
- [ ] Scrolling down loads more data automatically
- [ ] Scroll bar reflects total row count
- [ ] Sorting works correctly
- [ ] Filtering works correctly
- [ ] Performance is acceptable with large datasets

**Row-Level Editing:**
- [ ] Click Edit button enables row editing
- [ ] Row background changes to indicate edit mode
- [ ] All editable cells become input fields
- [ ] Can edit multiple cells
- [ ] Click Save commits changes to database
- [ ] Success: Row flashes green and returns to view mode
- [ ] Click Cancel discards changes and reverts
- [ ] Validation errors display correctly
- [ ] Failed updates revert to original values
- [ ] Only one row can be in edit mode at a time

**Column Grouping:**
- [ ] Columns are organized under group headers
- [ ] Group headers display correctly
- [ ] Columns show/hide based on `columnGroupShow` setting

**Column Visibility:**
- [ ] Column panel opens from sidebar
- [ ] Can show/hide individual columns
- [ ] Can show/hide entire groups
- [ ] Search functionality works
- [ ] Select/deselect all works
- [ ] Column state persists after page refresh

**Procedure Selection:**
- [ ] Dropdown shows available procedures
- [ ] Selecting procedure loads correct data
- [ ] Only authorized procedures are shown
- [ ] Grid adapts to different column structures

#### 4.4 Security Testing
**Reference:** implementation_plan.md → "Security Considerations"

**Test Cases:**
- [ ] Unauthorized users cannot access procedures
- [ ] Role-based access control works
- [ ] SQL injection attempts are blocked
- [ ] Procedure name validation works
- [ ] Input parameter validation works
- [ ] Audit logging captures changes

#### 4.5 Performance Testing
**Reference:** executive_summary.md → "Success Metrics"

**Test Cases:**
- [ ] Grid loads in < 2 seconds
- [ ] API response time < 500ms
- [ ] Infinite scrolling is smooth
- [ ] Can handle 100+ concurrent users
- [ ] Database queries are optimized
- [ ] No memory leaks in frontend

#### 4.6 User Acceptance Testing
**Reference:** executive_summary.md → "Use Cases"

**Scenarios:**
- [ ] **Multi-Tenant:** Different clients see different data
- [ ] **Department-Specific:** Different roles see different columns
- [ ] **Evolving Requirements:** Can add new columns without code changes
- [ ] **Onboarding:** New client procedure can be added in < 2 hours

### **Verification Checklist**
- [ ] All backend endpoints tested
- [ ] All stored procedures tested
- [ ] All frontend features tested
- [ ] Security validated
- [ ] Performance meets targets
- [ ] User acceptance criteria met
- [ ] Documentation updated with any changes
- [ ] Known issues documented

---

## 📊 Implementation Progress Tracking

Use **[task.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/task.md)** to track your progress through each phase.

### **Phase Completion Criteria**

**Phase 1 Complete When:**
- ✓ All database tables created
- ✓ All entity models created
- ✓ DbContext updated
- ✓ Migrations applied
- ✓ Stored procedures created
- ✓ Registry seeded with example data

**Phase 2 Complete When:**
- ✓ All DTOs created
- ✓ Service interface and implementation complete
- ✓ API controller created
- ✓ Services registered in DI
- ✓ API compiles and runs
- ✓ Endpoints testable via Swagger

**Phase 3 Complete When:**
- ✓ Dynamic grid service created
- ✓ Action buttons renderer created
- ✓ Dynamic grid component updated
- ✓ Demo component updated
- ✓ Frontend compiles and runs
- ✓ Grid displays in browser

**Phase 4 Complete When:**
- ✓ All test cases pass
- ✓ Security validated
- ✓ Performance targets met
- ✓ User acceptance complete
- ✓ Documentation finalized

---

## 🎯 Quick Reference by Task

### **Need to understand the overall architecture?**
→ Read **[architecture_diagram.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/architecture_diagram.md)**

### **Need to explain to stakeholders?**
→ Use **[executive_summary.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/executive_summary.md)**

### **Working on stored procedures?**
→ Reference **[stored_procedures_reference.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/stored_procedures_reference.md)**

### **Implementing row editing?**
→ Follow **[row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)**

### **Setting up infinite scrolling?**
→ Follow **[inline_editing_infinite_scroll_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/inline_editing_infinite_scroll_guide.md)**

### **Adding column groups?**
→ Follow **[column_grouping_visibility_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/column_grouping_visibility_guide.md)**

### **Need complete technical spec?**
→ Use **[implementation_plan.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/implementation_plan.md)**

---

## 🚀 Ready to Start?

**Recommended Approach:**
1. Start with **Phase 1** (Database)
2. Test stored procedures independently
3. Move to **Phase 2** (Backend API)
4. Test API endpoints with Postman
5. Proceed to **Phase 3** (Frontend)
6. Complete **Phase 4** (Testing)

**Estimated Timeline:**
- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 2-3 days
- **Total: 8-12 days**

Good luck with implementation! 🎉
