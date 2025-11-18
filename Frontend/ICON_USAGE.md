# Icon Usage Guide

This guide explains how to use different types of icons in the secondary sidebar menu.

## Icon Types

The application now supports three types of icons:

### 1. PrimeIcons (Default)
PrimeIcons are the default icon library. No special configuration needed.

**Example:**
```typescript
{
  label: 'Overview',
  icon: 'pi pi-chart-line',
  type: 'item',
  route: '/dashboard'
}
```

### 2. Font Awesome Icons
Font Awesome icons provide a wide variety of additional icons.

**Example:**
```typescript
{
  label: 'Chart Widgets',
  icon: 'fa-solid fa-chart-line',
  iconType: 'fontawesome',
  route: '/dashboard/charts'
}
```

**Available Font Awesome Styles:**
- `fa-solid` - Solid icons
- `fa-regular` - Regular icons
- `fa-light` - Light icons (Pro only)
- `fa-brands` - Brand icons

### 3. Custom Image Icons (PNG/SVG)
You can use custom PNG or SVG images as icons.

**Example:**
```typescript
{
  label: 'Data Widgets',
  icon: 'assets/icons/data-widget.png',
  iconType: 'image',
  route: '/dashboard/data'
}
```

## Adding Custom Icons

1. Place your icon files (PNG or SVG) in the `src/assets/icons/` folder
2. Reference them using the path `assets/icons/your-icon-name.png`
3. Set `iconType: 'image'` in your menu item configuration

**Recommended Image Specifications:**
- Format: PNG with transparency or SVG
- Size: 32x32 pixels or larger (will be scaled down)
- File size: Keep under 50KB for optimal performance

## Usage in Menu Data Service

Edit the `menu-data.service.ts` file to configure your menu items:

```typescript
private menuData = {
  dashboard: [
    // PrimeIcon (default)
    { 
      label: 'Overview', 
      icon: 'pi pi-chart-line', 
      type: 'item', 
      route: '/dashboard' 
    },
    { 
      label: 'Widgets', 
      icon: 'pi pi-th-large', 
      type: 'folder', 
      children: [
        // Font Awesome icon
        { 
          label: 'Chart Widgets', 
          icon: 'fa-solid fa-chart-line', 
          iconType: 'fontawesome', 
          route: '/charts' 
        },
        // Custom image icon
        { 
          label: 'Data Widgets', 
          icon: 'assets/icons/data-widget.png', 
          iconType: 'image', 
          route: '/data' 
        },
        // PrimeIcon (no iconType needed)
        { 
          label: 'Custom Widgets', 
          icon: 'pi pi-cog', 
          route: '/custom' 
        }
      ]
    }
  ]
};
```

## Resources

- **PrimeIcons:** https://primeng.org/icons
- **Font Awesome:** https://fontawesome.com/icons
- **Icon Design Tools:**
  - Figma
  - Adobe Illustrator
  - Inkscape (free SVG editor)
  - GIMP (free PNG editor)

## Notes

- Icon types can be mixed within the same menu structure
- Custom images are automatically sized to match the standard icon dimensions
- SVG files are recommended over PNG for better scalability
- Ensure proper color contrast for custom icons
