import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type PanelPosition = 'next-to-sidebar' | 'far-right';

@Injectable({
  providedIn: 'root'
})
export class PanelDragService {
  private readonly STORAGE_KEY = 'secondary-panel-position';
  private positionSubject = new BehaviorSubject<PanelPosition>('next-to-sidebar');
  
  public position$ = this.positionSubject.asObservable();
  
  constructor() {
    // Load saved position from localStorage
    const savedPosition = localStorage.getItem(this.STORAGE_KEY) as PanelPosition;
    if (savedPosition && (savedPosition === 'next-to-sidebar' || savedPosition === 'far-right')) {
      this.positionSubject.next(savedPosition);
    }
  }
  
  setPosition(position: PanelPosition): void {
    this.positionSubject.next(position);
    localStorage.setItem(this.STORAGE_KEY, position);
  }
  
  getCurrentPosition(): PanelPosition {
    return this.positionSubject.value;
  }
  
  togglePosition(): void {
    const currentPosition = this.getCurrentPosition();
    const newPosition: PanelPosition = currentPosition === 'next-to-sidebar' ? 'far-right' : 'next-to-sidebar';
    this.setPosition(newPosition);
  }
  
  handleDragEnd(event: MouseEvent, containerWidth: number, panelWidth: number): void {
    const dragEndX = event.clientX;
    const threshold = containerWidth * 0.7; // 70% of container width as threshold
    
    // If dragged past threshold, move to far right, otherwise keep next to sidebar
    const newPosition: PanelPosition = dragEndX > threshold ? 'far-right' : 'next-to-sidebar';
    this.setPosition(newPosition);
  }
}