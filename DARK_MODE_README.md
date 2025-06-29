# Dark Mode Implementation

This document describes the comprehensive dark mode implementation for the Opsage platform.

## Overview

The platform now supports a complete dark mode experience across all pages and features, with the following capabilities:

- **Light Mode**: Default bright theme
- **Dark Mode**: Dark theme for reduced eye strain
- **System Mode**: Automatically follows the user's system preference
- **Persistent**: Theme preference is saved in localStorage
- **Smooth Transitions**: All theme changes include smooth transitions

## Architecture

### Theme Context (`src/contexts/ThemeContext.tsx`)

The theme management is handled by a React context that provides:

- `theme`: Current theme setting ('light', 'dark', 'system')
- `setTheme`: Function to change the theme
- `resolvedTheme`: The actual applied theme ('light' or 'dark')

### CSS Variables

All colors are defined using CSS custom properties in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

### Tailwind Configuration

The Tailwind config is set up with `darkMode: ["class"]` to enable class-based dark mode switching.

## Components

### Theme Toggle (`src/components/ThemeToggle.tsx`)

A dropdown component that allows users to switch between:
- Light mode
- Dark mode  
- System mode (follows OS preference)

Features:
- Animated sun/moon icons
- Dropdown menu with all options
- Accessible with proper ARIA labels

### Updated Components

All major components have been updated to use CSS variables instead of hardcoded colors:

- **Header**: Navigation and branding
- **Dashboard**: Main application interface
- **AppSidebar**: Navigation sidebar
- **Auth**: Login/signup pages
- **HeroSection**: Landing page hero
- **Footer**: Site footer
- **AIChatPanel**: AI chat interface
- **MainContent**: Dashboard content areas

## Usage

### For Users

1. **Theme Toggle**: Click the sun/moon icon in the header to change themes
2. **System Mode**: Choose "System" to automatically follow your OS preference
3. **Persistence**: Your choice is automatically saved and restored

### For Developers

#### Using the Theme Context

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Switch to Dark</button>
    </div>
  );
}
```

#### Adding Dark Mode to New Components

1. **Use CSS Variables**: Replace hardcoded colors with CSS variables
   ```tsx
   // Instead of: className="bg-white text-black"
   // Use: className="bg-background text-foreground"
   ```

2. **Common Variables**:
   - `bg-background` / `text-foreground`: Main background/text
   - `bg-card` / `text-card-foreground`: Card backgrounds
   - `bg-muted` / `text-muted-foreground`: Muted elements
   - `border-border`: Borders
   - `bg-accent` / `text-accent-foreground`: Accent colors

3. **Sidebar Variables** (for sidebar components):
   - `bg-sidebar` / `text-sidebar-foreground`
   - `bg-sidebar-accent` / `text-sidebar-accent-foreground`

#### Testing Dark Mode

```tsx
// Test that components render correctly in both themes
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';

test('component works in dark mode', () => {
  render(
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );
  
  // Add dark class to document
  document.documentElement.classList.add('dark');
  
  // Test component behavior
});
```

## Features

### Automatic System Detection

The theme automatically detects and follows the user's system preference when set to "System" mode.

### Smooth Transitions

All theme changes include smooth CSS transitions for a polished user experience.

### Persistent Storage

Theme preferences are automatically saved to localStorage and restored on page reload.

### Accessibility

- Proper ARIA labels on theme toggle
- High contrast ratios maintained in both themes
- Keyboard navigation support

### Performance

- CSS variables for efficient theme switching
- No JavaScript re-renders required for theme changes
- Minimal bundle size impact

## Browser Support

- **Modern Browsers**: Full support for CSS variables and system preference detection
- **Fallbacks**: Graceful degradation for older browsers
- **Mobile**: Full support on mobile devices

## Future Enhancements

Potential improvements for future versions:

1. **Custom Themes**: Allow users to create custom color schemes
2. **Auto-switching**: Automatically switch themes based on time of day
3. **Animation Preferences**: Allow users to disable theme transition animations
4. **High Contrast Mode**: Additional accessibility theme option

## Troubleshooting

### Common Issues

1. **Theme not persisting**: Check localStorage permissions
2. **System mode not working**: Verify `prefers-color-scheme` media query support
3. **Inconsistent colors**: Ensure all components use CSS variables

### Debug Mode

Add this to the browser console to debug theme issues:

```javascript
// Check current theme
console.log('Theme:', localStorage.getItem('theme'));

// Check system preference
console.log('System dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);

// Force theme change
document.documentElement.classList.add('dark'); // or remove('dark')
``` 