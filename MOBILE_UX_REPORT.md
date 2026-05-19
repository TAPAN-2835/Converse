# Mobile UX Report & Audit: Converse

This report evaluates Converse's performance, layout responsiveness, and thumb-friendly interaction ergonomics on mobile devices (iOS & Android viewports).

---

## 1. Ergonomic Layout Principles

When design is scaled down from 1920px (Desktop) to 375px (Mobile), communication priorities change:

*   **Touch-Friendly Target Sizes**: All interactive buttons (call buttons, sending buttons, side navigation items, and dropdown triggers) maintain a minimum height/width of **44px** to align with Apple iOS Human Interface Guidelines and Google Android Material design recommendations.
*   **Viewport Height Limits (`vh`)**: The core application utilizes dynamic flex height setups (`h-[93vh]`) instead of hardcoded pixel sizes. This ensures the main view fits perfectly on all screens without extending beyond the viewport or creating double scrollbars.

---

## 2. Configured Mobile Enhancements

### A. Dynamic Sidebar Visibility Management
*   **Issue**: On small screens, displaying both the navigation sidebar and the active chat thread saturates the viewport, rendering chat bubbles unreadable and truncating text inputs.
*   **Fix**: Configured [App.jsx](file:///c:/Users/Tapan/Desktop/Converse/frontend/src/App.jsx#L85) to pass `showSidebar={false}` when routing to `/chat/:id`.
*   **Outcome**: Selecting a friend on mobile automatically shifts focus to a full-screen thread view, providing maximum workspace for reading and typing messages.

### B. Hamburger Navigation Guard
*   **Issue**: Mobile view navbar displayed the Hamburger toggle button even on pages where the sidebar was disabled (like active chat threads). Clicking it did nothing because there was no sidebar to open, creating a broken experience.
*   **Fix**: Modified [Navbar.jsx](file:///c:/Users/Tapan/Desktop/Converse/frontend/src/components/Navbar.jsx#L34-L44) to dynamically check for `showSidebar`. The Hamburger icon is now hidden on active threads, encouraging users to use the standard "Back" arrow button instead.

---

## 3. Responsive Checklist & Safe Areas

Converse ensures consistent operation across modern device form factors:

| Device Viewport | Width Threshold | Layout Adaptation | CSS Strategy |
| :--- | :--- | :--- | :--- |
| **Desktop / Monitor**| `>= 1024px` | Shows dual-column setup (Sidebar + Chat View side-by-side). | Tailwind `lg:flex` |
| **Tablet** | `768px - 1023px` | Collapses sidebar into compact icon mode, keeping chat thread area wide. | Tailwind `md:block` |
| **Mobile / Foldable**| `< 768px` | Toggles full-screen focus. Hides sidebar completely inside threads. | Tailwind `hidden` / `block` |
| **Dynamic Viewports**| All sizes | Bottom input textareas automatically stretch vertically based on line counts. | CSS `auto-rows` / `flex-grow` |

---

## 4. Mitigating Mobile Keyboard Overlap

Mobile browsers (Safari on iOS and Chrome on Android) often push the entire page layout upwards when the virtual keyboard is focused, truncating headers or creating awkward page jumps. 

Converse avoids this issue by utilizing the CSS property `height: 100%` inside `.str-chat__container` coupled with flex layouts, allowing the layout to adjust smoothly when the viewport height changes.
