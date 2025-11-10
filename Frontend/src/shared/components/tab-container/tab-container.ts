import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TabService } from '../../../core/services/tab.service';
import { Tab } from '../../../core/models/tab.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab-container',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './tab-container.html',
  styleUrl: './tab-container.scss'
})
export class TabContainerComponent implements OnInit, OnDestroy {
  tabs: Tab[] = [];
  activeTabId: string = '';
  private subscription = new Subscription();

  constructor(private tabService: TabService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.tabService.getTabs().subscribe(tabs => {
        this.tabs = tabs;
      })
    );

    this.subscription.add(
      this.tabService.getActiveTabId().subscribe(activeTabId => {
        this.activeTabId = activeTabId;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onTabClick(tabId: string): void {
    this.tabService.setActiveTab(tabId);
  }

  onTabClose(event: Event, tabId: string): void {
    event.stopPropagation(); // Prevent tab activation
    this.tabService.removeTab(tabId);
  }

  onTabMiddleClick(event: MouseEvent, tabId: string): void {
    if (event.button === 1) { // Middle mouse button
      event.preventDefault();
      this.tabService.removeTab(tabId);
    }
  }
}