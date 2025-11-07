import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BackupRecord {
  id: string;
  name: string;
  createdDate: Date;
  size: string;
  type: 'Auto' | 'Manual';
  status: 'Completed' | 'Failed' | 'In Progress';
  description?: string;
}

@Component({
  selector: 'app-backup-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backup-history.html',
  styleUrl: './backup-history.scss'
})
export class BackupHistoryComponent implements OnInit {
  backupRecords: BackupRecord[] = [];
  isLoading = false;
  selectedBackup: BackupRecord | null = null;

  ngOnInit(): void {
    console.log('BackupHistoryComponent initialized');
    this.loadBackupHistory();
  }

  loadBackupHistory(): void {
    console.log('Loading backup history...');
    
    // Load mock data immediately - no need for loading spinner
    this.backupRecords = [
      {
        id: '1',
        name: 'GridPortal_Full_Backup_2025_11_07',
        createdDate: new Date('2025-11-07T10:30:00'),
        size: '2.4 GB',
        type: 'Auto',
        status: 'Completed',
        description: 'Automatic daily backup'
      },
      {
        id: '2',
        name: 'GridPortal_Manual_Backup_2025_11_06',
        createdDate: new Date('2025-11-06T15:45:00'),
        size: '2.3 GB',
        type: 'Manual',
        status: 'Completed',
        description: 'Pre-deployment backup'
      },
      {
        id: '3',
        name: 'GridPortal_Auto_Backup_2025_11_06',
        createdDate: new Date('2025-11-06T02:00:00'),
        size: '2.3 GB',
        type: 'Auto',
        status: 'Completed',
        description: 'Scheduled backup'
      },
      {
        id: '4',
        name: 'GridPortal_Manual_Backup_2025_11_05',
        createdDate: new Date('2025-11-05T16:20:00'),
        size: '1.8 GB',
        type: 'Manual',
        status: 'Failed',
        description: 'Backup failed due to insufficient storage'
      },
      {
        id: '5',
        name: 'GridPortal_Auto_Backup_2025_11_05',
        createdDate: new Date('2025-11-05T02:00:00'),
        size: '2.2 GB',
        type: 'Auto',
        status: 'Completed',
        description: 'Scheduled backup'
      }
    ];
    
    console.log('Backup records loaded immediately:', this.backupRecords.length, 'records');
  }

  reloadData(): void {
    console.log('Reloading backup history...');
    this.selectedBackup = null;
    this.loadBackupHistory();
  }

  onBackupSelect(backup: BackupRecord): void {
    this.selectedBackup = this.selectedBackup?.id === backup.id ? null : backup;
  }

  onRestore(backup: BackupRecord): void {
    console.log('Restoring backup:', backup.name);
    alert(`Restoring backup: ${backup.name}`);
  }

  onDownload(backup: BackupRecord): void {
    console.log('Downloading backup:', backup.name);
    alert(`Downloading backup: ${backup.name}`);
  }

  onDelete(backup: BackupRecord): void {
    if (confirm(`Are you sure you want to delete backup: ${backup.name}?`)) {
      this.backupRecords = this.backupRecords.filter(b => b.id !== backup.id);
      this.selectedBackup = null;
      console.log('Deleted backup:', backup.name);
    }
  }

  onCreateBackup(): void {
    console.log('Creating new backup...');
    alert('Creating new manual backup...');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'status-completed';
      case 'Failed':
        return 'status-failed';
      case 'In Progress':
        return 'status-progress';
      default:
        return '';
    }
  }

  getTypeClass(type: string): string {
    return type === 'Auto' ? 'type-auto' : 'type-manual';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}