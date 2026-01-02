# Design System - GST Tennis Academy

## Overview
Sistema di design enterprise-level completamente aggiornato con palette professionale, componenti moderni e pattern consistenti.

## 🎨 Color Palette

### Primary Colors (Enterprise Blue)
- **Primary**: `#1e40af` - Blue-800 (Professional Blue)
- **Primary Light**: `#3b82f6` - Blue-500
- **Primary Dark**: `#1e3a8a` - Blue-900
- **Primary Hover**: `#2563eb` - Blue-600

### Semantic Colors
- **Success**: `#059669` (Emerald-600)
- **Warning**: `#d97706` (Amber-600)
- **Error**: `#dc2626` (Red-600)
- **Info**: `#2563eb` (Blue-600)

### Neutral Colors
- **Background**: `#ffffff` / `#020617` (light/dark)
- **Surface**: `#ffffff` / `#0f172a` (light/dark)
- **Border**: `#e2e8f0` / `#334155` (light/dark)

## 📝 Typography

### Font Family
- **Primary**: Inter (weights: 300-900)
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Type Scale

#### Display (For Heroes & Landing Pages)
```tsx
.text-display-2xl  // 72px, weight: 800
.text-display-xl   // 60px, weight: 800
.text-display-lg   // 48px, weight: 700
.text-display-md   // 36px, weight: 700
.text-display-sm   // 30px, weight: 600
```

#### Headings
```tsx
h1 / .text-h1  // 36px, weight: 700
h2 / .text-h2  // 30px, weight: 700
h3 / .text-h3  // 24px, weight: 600
h4 / .text-h4  // 20px, weight: 600
h5 / .text-h5  // 18px, weight: 600
h6 / .text-h6  // 16px, weight: 600
```

#### Body Text
```tsx
.text-body-lg  // 18px
.text-body     // 16px (default)
.text-body-sm  // 14px
.text-body-xs  // 12px
```

## 🧩 Components

### Button
8 varianti disponibili con 5 dimensioni:

```tsx
import { Button } from "@/components/ui";

// Varianti
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="outline">Outline</Button>
<Button variant="link">Link</Button>

// Dimensioni
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Stati e props
<Button isLoading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
<Button leftIcon={<Icon />}>With Icon</Button>
```

### Card
5 varianti con hover effects:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";

<Card variant="default">     // Solid background
<Card variant="glass">       // Glass morphism effect
<Card variant="bordered">    // Transparent with border
<Card variant="elevated">    // With shadow
<Card variant="interactive"> // Hover effects + cursor pointer

// Padding
<Card padding="none">  // No padding
<Card padding="sm">    // Small (16px)
<Card padding="md">    // Medium (24px) - default
<Card padding="lg">    // Large (32px)

// Example with all sub-components
<Card variant="elevated" hover>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    Your content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input
Input field con stati error, icon support, e hint:

```tsx
import { Input } from "@/components/ui";

<Input 
  label="Email"
  placeholder="Enter your email"
  error="Invalid email"
  hint="We'll never share your email"
  leftIcon={<Mail />}
  rightIcon={<Check />}
/>
```

### Badge
7 varianti con icon e dot support:

```tsx
import { Badge } from "@/components/ui";

<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success" icon>Success</Badge>
<Badge variant="error" dot>Error</Badge>
<Badge size="xs">Extra Small</Badge>
```

### Alert
Sistema di alert con 5 varianti:

```tsx
import { Alert } from "@/components/ui";

<Alert variant="success" title="Success!" dismissible onDismiss={() => {}}>
  Your changes have been saved successfully.
</Alert>

<Alert variant="error" title="Error">
  Something went wrong.
</Alert>

<Alert variant="warning" title="Warning">
  Please review your information.
</Alert>

<Alert variant="info">
  New features available!
</Alert>
```

### Toast (Notifications)
Sistema toast con context provider:

```tsx
// In layout or root component
import { ToastProvider } from "@/components/ui";

<ToastProvider>
  {children}
</ToastProvider>

// In any component
import { useToast } from "@/components/ui";

const { addToast } = useToast();

addToast({
  variant: "success",
  title: "Success!",
  message: "Action completed successfully",
  duration: 5000,
});
```

### Modal
Sistema modale con context:

```tsx
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui";

<Modal>
  <ModalTrigger>
    <Button>Open Modal</Button>
  </ModalTrigger>
  
  <ModalContent size="md">
    <ModalHeader>
      <ModalTitle>Modal Title</ModalTitle>
      <ModalDescription>Modal description text</ModalDescription>
    </ModalHeader>
    
    <ModalBody>
      Your modal content here
    </ModalBody>
    
    <ModalFooter>
      <Button variant="ghost">Cancel</Button>
      <Button>Confirm</Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

### Breadcrumbs
Sistema breadcrumb con home icon:

```tsx
import { Breadcrumbs } from "@/components/ui";

<Breadcrumbs
  items={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Users", href: "/dashboard/users" },
    { label: "Profile" },
  ]}
  showHome={true}
/>
```

## 🎭 Dashboard Components

### PageHeader
Header standardizzato con breadcrumbs e actions:

```tsx
import { PageHeader } from "@/components/layout/DashboardComponents";

<PageHeader
  title="Dashboard"
  description="Welcome to your dashboard"
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "Dashboard" },
  ]}
  actions={
    <>
      <Button variant="outline">Export</Button>
      <Button>Create New</Button>
    </>
  }
/>
```

### StatsCard
Card per statistiche con icon e trend:

```tsx
import { StatsCard } from "@/components/layout/DashboardComponents";

<StatsCard
  label="Total Users"
  value="1,234"
  icon={<Users className="h-6 w-6" />}
  trend={{ value: 12.5, isPositive: true }}
  color="blue"
/>
```

### EmptyState
Stato vuoto con icon e CTA:

```tsx
import { EmptyState } from "@/components/layout/DashboardComponents";

<EmptyState
  icon={<Inbox className="h-12 w-12" />}
  title="No items yet"
  description="Get started by creating your first item"
  action={<Button>Create Item</Button>}
/>
```

## 🎨 Design Tokens

### Spacing Scale
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px

### Border Radius
- `--border-radius-sm`: 6px
- `--border-radius-md`: 8px
- `--border-radius-lg`: 12px
- `--border-radius-xl`: 16px
- `--border-radius-2xl`: 24px

### Elevation System
- `--shadow-xs`: Minimal elevation
- `--shadow-sm`: Small elevation
- `--shadow-md`: Medium elevation (default)
- `--shadow-lg`: Large elevation
- `--shadow-xl`: Extra large elevation
- `--shadow-2xl`: Maximum elevation

### Transitions
- `--transition-fast`: 150ms ease
- `--transition-base`: 200ms ease (default)
- `--transition-slow`: 300ms ease

## 🎬 Animations

### Available Animations
```css
.animate-fade-in      /* Fade in with slide up */
.animate-slide-in     /* Slide in from left */
.animate-slide-up     /* Slide up */
.animate-scale-in     /* Scale in */
.animate-pulse        /* Pulse effect */
.animate-shimmer      /* Shimmer loading effect */
.animate-spin         /* Rotation */
```

### Loading States
```tsx
<div className="skeleton h-20 w-full" />  // Skeleton loader
<div className="spinner" />               // Spinner
```

## 📱 Responsive Design

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## ♿ Accessibility

Tutti i componenti includono:
- ARIA labels appropriati
- Focus states visibili
- Keyboard navigation
- Screen reader support
- Color contrast WCAG AA compliant

## 🌙 Dark Mode

Tutti i componenti supportano dark mode automaticamente tramite il `ThemeProvider`:

```tsx
import { ThemeProvider } from "@/components/theme";

<ThemeProvider defaultTheme="system">
  {children}
</ThemeProvider>
```

## 📦 Usage Example

```tsx
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Alert,
  useToast 
} from "@/components/ui";

export function MyComponent() {
  const { addToast } = useToast();

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dashboard</CardTitle>
          <Badge variant="success">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant="info" title="New Feature">
          Check out our latest updates!
        </Alert>
        <Button 
          variant="primary" 
          size="lg"
          onClick={() => addToast({
            variant: "success",
            message: "Action completed!"
          })}
        >
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}
```

## 🚀 Migration Notes

### Color Changes
- `sky-500` → `blue-800` (#1e40af)
- `cyan-500` → `cyan-600` (#0891b2)
- Old accent colors automaticamente aggiornati

### Font Changes
- Geist Sans → Inter
- Tutte le font utilities aggiornate automaticamente

### Component Updates
- Button: +4 nuove varianti (success, warning, link, secondary migliorato)
- Badge: +2 nuove varianti (primary, secondary)
- Card: +1 nuova variante (interactive)
- Input: Error icon automatico
- Tutti i componenti: Dark mode completo

---

**Version**: 2.0.0 (Enterprise)  
**Updated**: January 2, 2026
