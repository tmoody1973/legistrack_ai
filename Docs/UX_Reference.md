# UX Reference - LegisTrack AI
## Figma Design System & Implementation Guide

---

## Figma File Access

**Main Design File**: [UX Pilot - AI UI Generator](https://www.figma.com/design/ypJjHOCTw9qA0OZp17Yz7j/UX-Pilot--AI-UI-Generator---AI-Wireframe-Generator--Community-?node-id=0-1&m=dev&t=2sBp2VYUIjovXVmH-1)

**Dev Mode Access**: Available for component specifications and design tokens

---

## Design System Integration

### Extracting Design Tokens from Figma

1. **Access Dev Mode**: Use the provided link to access Figma's Dev Mode
2. **Inspect Components**: Click on any component to see CSS specifications
3. **Export Assets**: Download any required images or icons
4. **Copy Measurements**: Note spacing, typography, and color values

### Implementation Workflow

```typescript
// 1. Extract design tokens from Figma Dev Mode
const figmaTokens = {
  colors: {
    // Copy exact hex values from Figma
    primary: '#1e40af',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  },
  spacing: {
    // Copy spacing values from Figma
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    // Copy font specifications
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  }
};
```

### Tailwind CSS Configuration

```javascript
// tailwind.config.js - Update with Figma values
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Extract these exact values from your Figma file
        primary: {
          50: '#eff6ff',
          500: '#1e40af',
          600: '#1d4ed8',
          700: '#1e3a8a',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Add custom spacing from Figma
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}
```

---

## Component Implementation Guide

### Using Figma Dev Mode

1. **Select Component**: Click on any component in Figma
2. **View Specifications**: Dev Mode shows exact CSS properties
3. **Copy Values**: Use the provided measurements and styles
4. **Implement in React**: Create components matching the specifications

### Example: Button Component from Figma

```typescript
// Extract button specifications from Figma Dev Mode
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant, 
  size, 
  children, 
  onClick 
}) => {
  // Use exact classes that match Figma specifications
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200';
  
  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-primary-500 text-primary-500 hover:bg-primary-50'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

---

## Responsive Design Implementation

### Breakpoints from Figma

```css
/* Match Figma's responsive breakpoints */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Mobile-First Implementation

```typescript
// Example responsive component matching Figma designs
export const HeroSection: React.FC = () => {
  return (
    <section className="
      px-4 py-8 
      sm:px-6 sm:py-12 
      lg:px-8 lg:py-16 
      xl:px-12 xl:py-20
    ">
      <div className="max-w-7xl mx-auto">
        <h1 className="
          text-2xl font-bold text-gray-900 
          sm:text-3xl 
          lg:text-4xl 
          xl:text-5xl
        ">
          {/* Copy exact text from Figma */}
          Making Democracy Accessible Through AI
        </h1>
      </div>
    </section>
  );
};
```

---

## Asset Management

### Exporting from Figma

1. **Icons**: Export as SVG for scalability
2. **Images**: Export as WebP for performance
3. **Illustrations**: Export as SVG when possible

### Implementation in React

```typescript
// Icon component using Lucide React (as specified in requirements)
import { FileText, Users, BarChart3 } from 'lucide-react';

export const FeatureCard: React.FC<{
  icon: 'bill' | 'representatives' | 'analytics';
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  const icons = {
    bill: FileText,
    representatives: Users,
    analytics: BarChart3
  };
  
  const IconComponent = icons[icon];
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <IconComponent className="w-8 h-8 text-primary-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};
```

---

## Quality Assurance

### Design-to-Code Checklist

- [ ] **Spacing**: Margins and padding match Figma exactly
- [ ] **Typography**: Font sizes, weights, and line heights correct
- [ ] **Colors**: Exact hex values from Figma design system
- [ ] **Responsive**: All breakpoints implemented as designed
- [ ] **Interactions**: Hover states and animations match specifications
- [ ] **Accessibility**: Focus states and contrast ratios maintained

### Browser Testing

```bash
# Test responsive design
# Chrome DevTools -> Device Toolbar
# Test breakpoints: 320px, 768px, 1024px, 1440px

# Accessibility testing
# Chrome DevTools -> Lighthouse -> Accessibility audit
```

---

## Development Workflow

### Phase 1: Setup and Foundation

1. **Extract Design Tokens**: Use Figma Dev Mode to get exact values
2. **Configure Tailwind**: Update config with Figma specifications
3. **Create Base Components**: Button, Input, Card components
4. **Test Responsive**: Verify mobile/desktop layouts

### Phase 2: Page Implementation

1. **Landing Page**: Match hero section and feature cards exactly
2. **Navigation**: Implement header with all states from Figma
3. **Forms**: Email capture and contact forms
4. **Testing**: Cross-browser and device testing

### Phase 3: Advanced Features

1. **Dashboard Layout**: Complex grid systems from Figma
2. **Bill Cards**: Detailed component specifications
3. **Modal Dialogs**: Overlay and interaction patterns
4. **Animation**: Micro-interactions and transitions

---

## Figma Integration Tools

### Recommended Figma Plugins

- **Figma to React**: Generate component code
- **Design Tokens**: Export CSS custom properties
- **Figma to Tailwind**: Generate Tailwind classes

### VS Code Extensions

- **Figma for VS Code**: View designs directly in editor
- **Tailwind CSS IntelliSense**: Auto-complete for classes

---

## Troubleshooting

### Common Issues

1. **Spacing Discrepancies**: Double-check Figma measurements in Dev Mode
2. **Font Loading**: Ensure Inter font is properly imported
3. **Color Variations**: Use exact hex values from Figma color styles
4. **Responsive Issues**: Test all breakpoints defined in Figma

### Getting Help

- **Figma Community**: Access the original design file for reference
- **Dev Mode**: Use inspect tool for exact specifications
- **Design System**: Refer to Figma's component library for consistency

---

This integration guide ensures your implementation perfectly matches the Figma designs while maintaining code quality and accessibility standards.