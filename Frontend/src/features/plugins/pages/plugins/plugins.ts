import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-plugins',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './plugins.html',
  styleUrl: './plugins.scss'
})
export class PluginsComponent {
  plugins = [
    { id: 1, name: 'Plugin 1', description: 'First example plugin', status: 'active' },
    { id: 2, name: 'Plugin 2', description: 'Second example plugin', status: 'inactive' },
    { id: 3, name: 'Plugin 3', description: 'Third example plugin', status: 'active' }
  ];

  togglePlugin(plugin: any): void {
    plugin.status = plugin.status === 'active' ? 'inactive' : 'active';
  }
}
