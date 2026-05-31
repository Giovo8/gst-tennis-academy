# Design System

Il design system di GST Tennis Academy è definito tramite **CSS custom properties** in
`src/app/globals.css` e applicato con **Tailwind CSS 4**. La palette è ispirata al tema
"Frozen Lake" (azzurro/navy) con un look enterprise professionale.

---

## Palette colori

### Frozen Lake (brand)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-frozen-lake-50` | `#e6f7fe` | Sfondi tenui |
| `--color-frozen-lake-100` | `#cef0fd` | Sfondi muted |
| `--color-frozen-lake-200` | `#9ce1fc` | Bordi default |
| `--color-frozen-lake-300` | `#6bd2fa` | Bordi enfatizzati |
| `--color-frozen-lake-400` | `#39c3f9` | Primary light |
| `--color-frozen-lake-500` | `#08b3f7` | **Primary / accent** |
| `--color-frozen-lake-600` | `#0690c6` | Primary dark / hover |
| `--color-frozen-lake-700` | `#056c94` | Secondary light / testo secondario |
| `--color-frozen-lake-800` | `#034863` | **Secondary** / foreground principale |
| `--color-frozen-lake-900` | `#022431` | Sfondo scuro |
| `--color-frozen-lake-950` | `#011923` | Sfondo notifiche |

### Colori semantici

| Stato | Token | Hex |
|-------|-------|-----|
| Success | `--success` | `#059669` (Emerald-600) |
| Warning | `--warning` | `#d97706` (Amber-600) |
| Error | `--error` | `#dc2626` (Red-600) |
| Info | `--info` | `#08b3f7` (frozen-500) |

Ogni colore semantico dispone di varianti `-light`, `-dark`, `-bg`, `-border`.

---

## Tipografia e layout

| Token | Valore |
|-------|--------|
| Foreground principale | `--foreground` = `#034863` |
| Foreground secondario | `--foreground-muted` = `#056c94` |
| Sfondo | `--background` = `#ffffff` |
| Larghezza sidebar | `--sidebar-width` = `280px` |

---

## Border radius

| Token | Valore |
|-------|--------|
| `--border-radius-sm` | 6px |
| `--border-radius-md` | 8px |
| `--border-radius-lg` | 12px |
| `--border-radius-xl` | 16px |
| `--border-radius-2xl` | 24px |

---

## Elevazione (ombre)

Sistema di ombre da `--shadow-xs` a `--shadow-2xl`, con `--shadow-inner` per gli incassi.
Ombre morbide e a bassa opacità per un look enterprise pulito.

---

## Componenti UI

I componenti riutilizzabili si trovano in `src/components/ui/` e includono il sistema di
**modali** (`ModalContent`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter`,
`ModalDescription`) e primitive base.

Le dashboard usano un look **glassmorphism** su sfondo scuro con effetti `backdrop-blur` e
accento azzurro frozen-500. I componenti chiave includono `StatCard`, `DashboardLinkCard`,
`NotificationsList`, `WeatherCard` e `UpcomingCommitmentsCard`.

La pagina `/dashboard/admin/design-system-demo` mostra dal vivo la libreria di componenti.

---

## Convenzioni

- Comporre le classi con `cn()` (`src/lib/utils.ts`, basato su `clsx` + `tailwind-merge`).
- Usare i token CSS (`var(--primary)`, `var(--success)`…) invece di valori hardcoded.
- Preferire i colori semantici per gli stati (success/warning/error/info).
- Mantenere coerenti border-radius e ombre tramite i token dedicati.

Per accessibilità e ottimizzazione mobile vedi [FRONTEND.md](FRONTEND.md).
