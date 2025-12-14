# Hybrid Pagination Implementation Plan

## Overview
Implement intelligent pagination that automatically switches between client-side and server-side modes based on dataset size for optimal performance without requiring AG Grid Enterprise.

## Strategy

### Small Datasets (< 1000 records)
- **Mode**: Client-side pagination
- **Behavior**: Load all data at once
- **Pagination**: AG Grid built-in
- **Benefits**: Instant sorting/filtering, no server round-trips

### Large Datasets (≥ 1000 records)
- **Mode**: Server-side pagination with manual controls
- **Behavior**: Load one page at a time
- **Pagination**: Custom controls + API calls
- **Benefits**: Efficient memory usage, handles millions of rows

## Implementation Changes

### 1. Frontend Service Updates
**File**: `dynamic-grid.service.ts`

Add method to get total count first:
```typescript
getTotalCount(procedureName: string): Observable<number>
```

### 2. Dynamic Grid Component Updates
**File**: `dynamic-grid.ts`

- Add `@Input() paginationThreshold: number = 1000`
- Add `currentPage: number = 1`
- Add `isServerSidePagination: boolean = false`
- Modify `loadGridData()` to check total count first
- Add `loadClientSideData()` for small datasets
- Add `loadServerSideData(page)` for large datasets
- Add pagination event handlers

### 3. Template Updates
**File**: `dynamic-grid.html`

Add custom pagination controls (shown only for large datasets):
```html
<div *ngIf="isServerSidePagination" class="custom-pagination">
  <button (click)="previousPage()">Previous</button>
  <span>Page {{currentPage}} of {{totalPages}}</span>
  <button (click)="nextPage()">Next</button>
</div>
```

### 4. Demo Component Updates
**File**: `dynamic-grid-demo.ts`

- Add `paginationThreshold` input (configurable per grid)
- Add info display showing pagination mode

## Backend Support

✅ **Already implemented** - stored procedures support:
- `p_PageNumber` - which page to fetch
- `p_PageSize` - rows per page
- Returns `totalCount` for calculating pages

## Testing Plan

1. **Small dataset test** (105 employees):
   - Should use client-side pagination
   - All data loads at once
   - AG Grid pagination visible

2. **Large dataset test** (generate 2000 employees):
   - Should use server-side pagination
   - Custom pagination controls appear
   - Only 15 rows loaded per page
   - "Next" button fetches new page

## User Experience

- **Seamless**: Users don't notice the switch
- **Consistent**: AG Grid UI remains the same
- **Performant**: No browser crashes with large datasets
- **Configurable**: Threshold can be adjusted per grid

## Configuration Example

```typescript
<app-dynamic-grid
  [procedureName]="selectedProcedure"
  [paginationThreshold]="1000"
  [pageSize]="15">
</app-dynamic-grid>
```

## Rollout Steps

1. ✅ Update service with total count method
2. ✅ Modify grid component logic
3. ✅ Update template with custom controls
4. ✅ Add styling for pagination controls
5. ✅ Test with small dataset (105 records)
6. ✅ Generate large dataset (2000 records)
7. ✅ Test with large dataset
8. ✅ Verify pagination switching works
