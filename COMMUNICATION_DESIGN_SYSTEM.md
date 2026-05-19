# Communication Design System: Converse

This document defines the shared design tokens, layout principles, and custom component primitives that unify Converse's visual language across all platforms.

---

## 1. Core Visual Foundations

Converse builds upon **DaisyUI** and **TailwindCSS** tokens, mapping them to specific chat and video calling components to ensure a premium, unified user experience.

### Brand Typography
*   **Primary Typeface**: `Inter`, `system-ui`, `-apple-system`, `sans-serif`. Designed for legibility, compact spacing, and clear character separation in multi-user message grids.
*   **Icon Library**: `lucide-react`. Vector icons that adapt to active text-content color values.
*   **Scale**:
    ```
    Text Size  | Size (px) | Application Area
    xs         | 11px      | Time indicators, unread lines
    sm         | 14px      | Message bubbles, input text, sidebar lists
    base       | 16px      | Username titles, main page headers
    lg         | 18px      | Discover search query, empty state indicators
    ```

---

## 2. Shared Primitives

### A. Message Bubbles Hierarchy
To maintain reading flow, Converse enforces a strict layout contract for own vs. peer messages:

```
[Peer Message (Left Side)]
Avatar   ┌────────────────────────────────────────────────────────┐
  ○      │ Peer User  12:00 PM                                    │
         ├────────────────────────────────────────────────────────┤
         │ background-color: hsl(var(--b2))                       │
         │ border: 1px solid hsl(var(--b3))                       │
         │ color: hsl(var(--bc))                                  │
         │ border-top-left-radius: 4px                            │
         └────────────────────────────────────────────────────────┘

[Own Message (Right Side)]
         ┌────────────────────────────────────────────────────────┐
         │ You  12:01 PM                                          │
         ├────────────────────────────────────────────────────────┤
         │ background-color: hsl(var(--p)) (Primary Brand Color)  │
         │ color: hsl(var(--pc))                                  │
         │ border-top-right-radius: 4px                           │
         └────────────────────────────────────────────────────────┘
```

---

## 3. Dynamic Theme Map (DaisyUI Synchronizer)

By avoiding hardcoded hex colors, Converse dynamically renders themes:

| Element | Light Mode Variant | Dark Mode Variant | Tailwind Class Mappings |
| :--- | :--- | :--- | :--- |
| **Main Background** | Pure White / Ivory | Slate / Deep Obsidian | `bg-base-100` |
| **Panel Background**| Light Grey | Charcoal / Dark Purple | `bg-base-200` |
| **Border Outline** | Light Grey | Charcoal Border | `border-base-300` |
| **Primary Bubble** | Violet / Corporate Blue | Bright Purple / Neon | `bg-primary text-primary-content` |
| **Peer Bubble** | Light Grey Bubble | Slate / Dark Grey | `bg-base-200 text-base-content` |

---

## 4. Spacing Scale & Safe Areas

*   **Header Safe Area**: Enforces a strict `h-[7vh]` or custom safe border padding on headers to prevent text truncation on mobile devices.
*   **Viewport Height constraints**: Chat views utilize standard `h-[93vh]` configurations to occupy the remaining screen workspace without forcing inner scrolls.
*   **Cellular Padding**: Mobile views adjust message input margins to `px-4 py-2` (from desktop `px-6 py-4`) to maximize space for message bubbles.
