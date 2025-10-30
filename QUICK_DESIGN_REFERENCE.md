# Quick Design Reference - SolanaLance

## Color Palette

### Primary Colors
```
Primary (Solana Green): hsl(160, 100%, 40%) - #00cf86
Secondary (Purple):     hsl(270, 100%, 65%) - #a366ff
Background:             hsl(0, 0%, 4%)       - #0a0a0a
Card:                   hsl(0, 0%, 8%)       - #141414
Border:                 hsl(0, 0%, 18%)      - #2e2e2e
```

### Usage Examples

#### ✅ DO
```tsx
// Primary CTAs
<Button className="bg-primary hover:bg-primary/90">
  Get Started
</Button>

// Emphasis Text
<h1>Welcome to <span className="text-primary">SolanaLance</span></h1>

// Modern Cards
<div className="modern-card hover-lift">
  <p>Card content</p>
</div>

// Icon Containers
<div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20">
  <Icon className="text-primary" />
</div>
```

#### ❌ DON'T
```tsx
// Don't use gradients
<Button className="bg-gradient-solana"> ❌
<span className="text-gradient"> ❌

// Don't use glass effects  
<div className="glass"> ❌
<div className="backdrop-blur-xl bg-white/5"> ❌

// Don't use arbitrary borders
<div className="border-white/10"> ❌
```

## Component Patterns

### Cards
```tsx
// Standard Card
<div className="modern-card">
  <h3 className="text-xl font-semibold mb-2">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>

// Interactive Card with Accent
<div className="group relative modern-card hover-lift">
  <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all duration-200 rounded-l-lg"></div>
  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20">
    <Icon className="text-primary" />
  </div>
  <h3>Content</h3>
</div>
```

### Buttons
```tsx
// Primary CTA
<Button className="bg-primary hover:bg-primary/90 accent-glow">
  Primary Action
</Button>

// Secondary
<Button variant="outline" className="border-border hover:bg-muted">
  Secondary Action
</Button>
```

### Badges/Pills
```tsx
// Info Badge
<div className="badge-info">
  New Feature
</div>

// Success Badge
<div className="badge-success">
  Completed
</div>

// Skill Tag
<span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
  React
</span>
```

### Forms
```tsx
// Input
<Input 
  className="bg-card border-border focus:border-primary"
  placeholder="Search..."
/>

// Select
<Select>
  <SelectTrigger className="border-border">
    <SelectValue />
  </SelectTrigger>
</Select>
```

### Avatars
```tsx
<Avatar>
  <AvatarImage src={url} />
  <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary">
    {initials}
  </AvatarFallback>
</Avatar>
```

## Utility Classes

### Layout
- `modern-card` - Professional card with hover effect
- `hover-lift` - Subtle lift on hover (-2px translate)
- `grid-pattern` - Subtle grid background

### Accents
- `accent-border` - Left border with primary color
- `accent-border-top` - Top border with primary color
- `accent-glow` - Subtle primary glow (for CTAs only)
- `accent-glow-strong` - Stronger glow
- `neon-line` - Vertical neon accent line

### Badges
- `badge-success` - Success state badge
- `badge-warning` - Warning state badge  
- `badge-info` - Info badge
- `badge-secondary` - Secondary badge

## Background Patterns

### Hero/Auth Pages
```tsx
<div className="min-h-screen grid-pattern">
  {/* Content */}
</div>
```

### Accent Lines
```tsx
{/* Horizontal accent */}
<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

{/* Vertical accent */}
<div className="absolute top-40 left-0 w-px h-96 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
```

## Typography

### Headings
```tsx
<h1 className="text-5xl font-bold tracking-tight">
  Main Heading
</h1>

<h2 className="text-4xl font-bold">
  Section <span className="text-primary">Heading</span>
</h2>

<h3 className="text-xl font-semibold">
  Subsection
</h3>
```

### Body Text
```tsx
<p className="text-muted-foreground text-lg leading-relaxed">
  Large body text
</p>

<p className="text-muted-foreground text-sm">
  Small body text
</p>
```

## Spacing & Sizing

### Consistent Sizes
- Icon containers: `w-12 h-12` (large), `w-10 h-10` (medium), `w-8 h-8` (small)
- Button heights: `h-14` (hero), `h-12` (large), `h-10` (default)
- Border radius: `rounded-lg` (default), `rounded-xl` (large)
- Padding: `p-6` (cards), `p-4` (small cards)
- Gaps: `gap-6` (grids), `gap-4` (forms)

## Animation Guidelines

### Keep It Minimal
- ✅ Use `transition-colors` for color changes
- ✅ Use `transition-transform` for hover lifts
- ✅ Use `transition-shadow` for depth changes
- ❌ Avoid pulsing animations
- ❌ Avoid animated gradients
- ❌ Avoid excessive glows

### Transitions
```tsx
// Standard hover
<div className="hover:border-primary/40 transition-all duration-200">

// Lift effect
<div className="hover-lift">

// Color transition
<button className="hover:text-primary transition-colors">
```

## Pro Tips

1. **Always use semantic color tokens** - `bg-card`, `text-muted-foreground`, etc.
2. **Primary color is for emphasis** - Use sparingly for impact
3. **Borders define structure** - Use `border-border` consistently
4. **Hover states should be subtle** - Small transform or color change
5. **Icons in primary color** - `text-primary` for consistency
6. **Spacing matters** - Use consistent padding/margin scale

## Before/After Examples

### Button
```tsx
// ❌ Before
<Button className="bg-gradient-solana hover:opacity-90 border-0">

// ✅ After
<Button className="bg-primary hover:bg-primary/90">
```

### Card
```tsx
// ❌ Before
<div className="glass border-white/10 bg-gradient-card">

// ✅ After
<div className="modern-card">
```

### Heading
```tsx
// ❌ Before
<h1>Welcome to <span className="text-gradient">SolanaLance</span></h1>

// ✅ After
<h1>Welcome to <span className="text-primary">SolanaLance</span></h1>
```

---

**Remember:** Professional, bold, and clean. Let the content shine, not the gradients.

