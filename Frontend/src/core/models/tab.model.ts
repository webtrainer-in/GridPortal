export interface Tab {
  id: string;
  title: string;
  route: string;
  icon?: string;
  isActive: boolean;
  canClose: boolean;
  data?: any; // Additional data to pass to the component
}

export interface TabMenuData {
  menuType: string;
  itemLabel: string;
  route: string;
  icon?: string;
}

export interface MenuItem {
  label: string;
  icon: string;
  type?: 'item' | 'folder';
  route?: string; // The route to navigate to when clicked
  children?: MenuItem[];
}