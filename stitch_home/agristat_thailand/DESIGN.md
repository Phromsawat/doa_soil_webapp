---
name: AgriStat Thailand
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dada'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#44474d'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4d6079'
  primary: '#000917'
  on-primary: '#ffffff'
  primary-container: '#0d2137'
  on-primary-container: '#7689a4'
  inverse-primary: '#b5c8e5'
  secondary: '#006c48'
  on-secondary: '#ffffff'
  secondary-container: '#92f7c3'
  on-secondary-container: '#00734d'
  tertiary: '#000b05'
  on-tertiary: '#ffffff'
  tertiary-container: '#002617'
  on-tertiary-container: '#579476'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b5c8e5'
  on-primary-fixed: '#081c32'
  on-primary-fixed-variant: '#364860'
  secondary-fixed: '#92f7c3'
  secondary-fixed-dim: '#75daa8'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#b1f0ce'
  tertiary-fixed-dim: '#95d4b3'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#0e5138'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  display-lg:
    fontFamily: notoSans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: notoSans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: notoSans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: notoSans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-lg:
    fontFamily: inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: notoSans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 16px
---

## Brand & Style
The design system is engineered for the Thai Department of Agriculture, balancing government authority with modern AgriTech efficiency. It targets Thai farmers and agricultural officers, demanding a high degree of legibility, trust, and data clarity. 

The aesthetic follows a **Corporate / Modern** direction with subtle **Minimalist** influences. It prioritizes information density without sacrificing accessibility. The interface must feel like a precision tool—stable, official, and technologically advanced, mirroring the precision of soil analysis data.

## Colors
The palette is anchored by a deep navy to project stability and governmental authority. The mint green accent is used strategically for "growth" indicators, success states, and primary actions, providing a clear visual link to agriculture. 

The background uses a specific light gray-green to reduce eye strain in outdoor conditions. Neutral tones are used for secondary information, while high-contrast status colors (red and amber) are reserved for critical soil nutrient deficiencies or system alerts.

## Typography
This design system utilizes a dual-font strategy. **Noto Sans (Thai)** provides exceptional legibility for official communication and agricultural terms in the Thai language. **Inter** is utilized for all English text and numerical data, ensuring that soil test results, coordinates, and percentages are rendered with mathematical precision. 

Data-heavy displays (e.g., pH levels, Nitrogen counts) should use the `data-lg` style to ensure key metrics are the first thing a user sees.

## Layout & Spacing
The system employs a **Fluid Grid** model. On mobile devices, a 4-column grid is used with 16px side margins. On desktop, it scales to a 12-column system to accommodate complex data dashboards and mapping interfaces.

Spacing follows a strict 4px / 8px baseline rhythm to maintain a disciplined, data-driven appearance. Card components should be separated by 16px (`md`) to create clear visual groupings of different soil metrics.

## Elevation & Depth
Depth is handled through **Ambient Shadows** and **Tonal Layers**. To maintain a professional government feel, the system avoids aggressive shadows. 

The primary surface is the light gray-green background. White cards sit at an elevation of +1, using a soft, low-opacity shadow (`0 2px 8px rgba(0,0,0,0.08)`) to provide separation. Interactive elements like buttons do not use shadows but instead use color shifts to indicate state, keeping the UI flat and focused on data.

## Shapes
The shape language is structured to be approachable yet professional. Container elements like cards and modal sheets use a **12px radius** to soften the data-heavy interface. Actionable components like buttons, checkboxes, and input fields use a tighter **8px radius** to signal precision and utility.

## Components
- **Buttons:** Primary buttons use a solid `#52B788` fill with white text for high visibility. Secondary buttons use a `#0D2137` outline. Minimum touch target is 48px.
- **Cards:** White background with a 1px border of `#E5E7EB` and the defined 8px shadow. Header sections within cards should have a subtle bottom divider.
- **Input Fields:** 8px radius with a 1px border. Focus state uses a 2px mint green outline. 
- **Bottom Tab Bar:** Fixed to the bottom of mobile screens. Uses a white background with `#0D2137` icons. Active states use a mint green indicator dot or icon tint.
- **Data Chips:** Small, 4px rounded labels used for soil status (e.g., "Optimal", "Acidic"). Backgrounds should be low-saturation versions of the status color.
- **Navigation Rail (Tablet/Desktop):** A vertical sidebar replacing the bottom tab bar on larger screens, using the primary navy color for the background to maintain an authoritative anchor.