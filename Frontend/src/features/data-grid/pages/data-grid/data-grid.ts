import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicGridDemoComponent } from '../../../../shared/components/dynamic-grid';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, DynamicGridDemoComponent],
  template: `
    <div class="data-grid-wrapper">
      <app-dynamic-grid-demo></app-dynamic-grid-demo>
    </div>
  `,
  styles: [`
    .data-grid-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    app-dynamic-grid-demo {
      flex: 1;
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class DataGridComponent {}
