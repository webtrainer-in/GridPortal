import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <div class="settings-page">
      <h2>Application Settings</h2>
      <p-card header="General Settings" class="mt-3">
        <p>Application settings and configuration options will be implemented here.</p>
        <p-button label="Save Settings" icon="pi pi-save" class="mt-2"></p-button>
      </p-card>
    </div>
  `,
  styles: [`
    .settings-page {
      h2 {
        color: #2d3748;
        margin-bottom: 1rem;
      }
    }
  `]
})
export class SettingsComponent {
}