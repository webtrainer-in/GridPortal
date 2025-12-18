import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrillDownLevel } from '../../../core/models/drill-down.model';

@Component({
  selector: 'app-drill-down-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="breadcrumb-container" *ngIf="levels.length > 0">
      <button 
        *ngIf="currentLevel > 0" 
        class="back-button"
        (click)="onBack()"
        title="Go back (Backspace)">
        ← Back
      </button>
      <nav class="breadcrumb">
        <span 
          *ngFor="let level of levels; let i = index"
          [class.active]="i === currentLevel"
          [class.clickable]="i < currentLevel"
          (click)="onBreadcrumbClick(i)"
          [title]="level.procedureName">
          {{ level.breadcrumbLabel }}
          <span *ngIf="i < levels.length - 1" class="separator">›</span>
        </span>
      </nav>
    </div>
  `,
  styles: [`
    .breadcrumb-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
    }

    .back-button {
      padding: 6px 12px;
      background: #fff;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #f0f0f0;
      border-color: #1976d2;
      color: #1976d2;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .breadcrumb span {
      color: #666;
      transition: color 0.2s;
    }

    .breadcrumb span.clickable {
      color: #1976d2;
      cursor: pointer;
      text-decoration: underline;
    }

    .breadcrumb span.clickable:hover {
      color: #1565c0;
    }

    .breadcrumb span.active {
      color: #333;
      font-weight: 600;
    }

    .separator {
      color: #999;
      font-weight: normal;
      text-decoration: none !important;
      cursor: default !important;
    }
  `]
})
export class DrillDownBreadcrumbComponent {
  @Input() levels: DrillDownLevel[] = [];
  @Input() currentLevel: number = 0;
  @Output() navigate = new EventEmitter<number>();
  @Output() back = new EventEmitter<void>();

  onBack(): void {
    this.back.emit();
  }

  onBreadcrumbClick(index: number): void {
    if (index < this.currentLevel) {
      this.navigate.emit(index);
    }
  }
}
