import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <div class="users-page">
      <h2>Users Management</h2>
      <p-card header="Users List" class="mt-3">
        <p>User management features will be implemented here.</p>
        <p-button label="Add User" icon="pi pi-plus" class="mt-2"></p-button>
      </p-card>
    </div>
  `,
  styles: [`
    .users-page {
      h2 {
        color: #2d3748;
        margin-bottom: 1rem;
      }
    }
  `]
})
export class UsersComponent {
}