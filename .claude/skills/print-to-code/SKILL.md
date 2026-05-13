---
name: print-to-code
description: "Converts any URL, screenshot, or template (Webflow, Framer, Spline, live site) into production-ready React + Tailwind v4 + shadcn/ui code."
---

# Print to Code

Convert any visual design into a production-ready React + Tailwind v4 + shadcn/ui project.

## Inputs Accepted

| Input | Detection | Capture Method |
|-------|-----------|----------------|
| Screenshot/image | User attaches image file | Claude vision analysis |
| URL of live site | Starts with http/https | Deep Capture (Phase 0) + Firecrawl/WebFetch. Usa `--shallow` para pular Deep Capture |
| Text description | No image or URL | Direct generation from description |
| Pasted HTML/CSS | Contains `<div`, `className`, `class=` | Parse and convert |

## Pipeline

Cinco phases para screenshots/descrições. Seis phases para URLs (Phase 0: Deep Capture adicionada automaticamente).
Execute todas as phases aplicáveis em ordem para cada request.

- **URLs (http/https):** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (6 phases)
- **Screenshots/imagens, descrições, HTML/CSS:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (5 phases)
- **URLs com `--shallow`:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (5 phases, Deep Capture pulada)

### Phase 0: DEEP CAPTURE (apenas URLs)

**Ativa automaticamente quando o input for URL (http/https). Para screenshots, descrições ou HTML/CSS, pular diretamente para Phase 1.**

**Opt-out:** Usuário pode acrescentar `--shallow` à instrução para pular Deep Capture completamente e seguir com o pipeline padrão de 5 phases.

**Execução:**

```bash
node infrastructure/services/etl/bin/extract-site-design.js "{url}" \
  --output-dir /tmp/ptc-{timestamp} \
  --skip-motion \
  --skip-assets \
  --format json
```

Onde `{timestamp}` é gerado com `Date.now()` para garantir diretório único por execução.

**Exit codes e tratamento:**

| Exit Code | Significado | Ação |
|-----------|-------------|------|
| `0` | Sucesso. `design-tokens.json` disponível em `/tmp/ptc-{timestamp}/design-tokens.json` | Usar tokens nas phases seguintes |
| `1` | Sucesso parcial. Alguns extractors falharam | Tentar usar tokens disponíveis; campos ausentes usam estimativa visual |
| `2` | Timeout global excedido | Fallback para pipeline padrão |
| `3` | Erro HTTP ao carregar página | Fallback para pipeline padrão |
| `4` | URL inválida | Fallback para pipeline padrão |
| `5` | Outro erro (Playwright ausente, etc.) | Fallback para pipeline padrão |

**Fallback:** Se exit code >= 2 ou se `design-tokens.json` não existe no output dir, logar:

```
⚠ Deep Capture falhou (exit {code}). Prosseguindo com captura visual padrão.
```

E continuar normalmente para Phase 1 sem tokens. O pipeline existente NUNCA quebra por falha no Deep Capture.

**Mapeamento de campos do design-tokens.json:**

| Campo do design-tokens.json | Usado em | Propósito |
|------------------------------|----------|-----------|
| `colors.palette` | Phase 1 + Phase 5 | Cores exatas do design system (K-means++ CIELAB clustering) |
| `colors.semantic_mapping` | Phase 5 `:root` | Mapeamento semântico (primary, secondary, accent, background, foreground, muted) |
| `colors.dark_mode` | Phase 5 `.dark` | Variante dark mode detectada automaticamente |
| `colors.contrast_pairs` | Phase 5 | Pares WCAG AA/AAA para validação de acessibilidade |
| `typography.font_families` | Phase 1 + Phase 5 | Famílias tipográficas com confidence e source (google, custom, system) |
| `typography.scale` | Phase 5 `@theme inline` | Escala tipográfica do site (sizes, line-heights, weights) |
| `spacing.base_unit` | Phase 5 `@theme inline` | Base unit do sistema de espaçamento (4px ou 8px) |
| `spacing.scale` | Phase 5 `@theme inline` | Escala completa de espaçamento |
| `borders.radius` | Phase 5 `@theme inline` | Border radius values do site |
| `borders.width` | Phase 5 `@theme inline` | Border width values |
| `shadows` | Phase 5 | Box shadow values indexados por nome semântico |
| `custom_properties` | Phase 5 `:root` | CSS custom properties nativas do site (ADR-12) |

---

### Phase 1: CAPTURE

**For screenshots/images:**

1. Analyze the image using vision capabilities
2. Identify and catalog:
   - Overall layout structure (grid columns, sidebar, full-width sections)
   - Color palette (extract exact hex/hsl values visible)
   - Typography (font weights, sizes, hierarchy)
   - Spacing patterns (gaps, padding, margins)
   - All interactive elements (buttons, inputs, links, toggles)
   - All content sections (hero, features, pricing, testimonials, footer, nav)
3. Note image dimensions and aspect ratios for placeholders

**For URLs:**

1. Attempt Firecrawl MCP if available:
   - `firecrawl_scrape(url)` for structured markdown
2. Fallback to WebFetch if Firecrawl unavailable
3. Extract from scraped content:
   - HTML structure and semantic elements
   - CSS classes and styling patterns
   - Component hierarchy
   - Navigation structure
   - Color values and design tokens

**Se Deep Capture bem-sucedida (design-tokens.json disponível):**

4. Substituir estimativas visuais por dados extraídos de alta fidelidade:
   - Usar cores exatas de `colors.palette` em vez de inferir do HTML/CSS scraped
   - Usar `typography.font_families` (entrada com maior confidence) como fonte principal identificada
   - Documentar a origem no output: "Tokens extraídos via Deep Capture -- alta fidelidade"
   - Nota: Cores, fonts e spacing do design-tokens.json têm precedência sobre valores inferidos pelo Firecrawl/WebFetch

**For text descriptions:**

1. Identify the type of page/component described
2. Reference common patterns for that type
3. Proceed directly to Phase 3

### Phase 2: DECOMPOSE

Break the captured design into atomic, buildable sections.

1. **Identify page sections** (top to bottom):
   - Navbar / Header
   - Hero section
   - Feature grid / cards
   - Social proof / testimonials
   - Pricing table
   - CTA section
   - FAQ / accordion
   - Footer
   - Any other distinct sections

2. **For each section, identify components:**
   - Reusable vs one-off
   - Interactive vs static
   - Data-driven vs hardcoded

3. **Map hierarchy:**
   ```
   Page
   ├── Navbar (reusable)
   ├── HeroSection (one-off)
   │   ├── Heading + subheading
   │   ├── CTA buttons (→ shadcn Button)
   │   └── Hero image/illustration
   ├── FeatureGrid (reusable pattern)
   │   └── FeatureCard × N (→ shadcn Card)
   └── Footer (reusable)
   ```

4. **Assign build order:** Independent components first, then composed sections, then page assembly.

### Phase 3: CONVERT TO TSX + TAILWIND

Generate each component as a separate `.tsx` file.

**File structure to generate:**

```
src/
├── components/
│   ├── ui/                # shadcn/ui (DO NOT generate - installed via CLI)
│   ├── sections/          # Page sections from decomposition
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── PricingSection.tsx
│   │   └── Footer.tsx
│   └── layout/
│       └── PageLayout.tsx  # Wrapper with consistent spacing
├── lib/
│   └── utils.ts           # cn() helper
├── App.tsx                 # Assembles all sections
├── main.tsx
└── index.css              # Theme (Phase 5)
```

**Code generation rules:**

1. **TypeScript strict** - All components with typed props interfaces
2. **Tailwind utility classes only** - No inline styles, no CSS modules, no styled-components
3. **Mobile-first responsive** - Start with mobile, add `md:` and `lg:` breakpoints
4. **Semantic HTML** - `<header>`, `<main>`, `<section>`, `<nav>`, `<footer>`
5. **Component per file** - One exported component per `.tsx` file
6. **Named exports** - `export function HeroSection()` not default exports

**Props pattern:**

```tsx
interface HeroSectionProps {
  title: string
  subtitle: string
  ctaText?: string
  ctaHref?: string
}

export function HeroSection({
  title,
  subtitle,
  ctaText = "Get Started",
  ctaHref = "#",
}: HeroSectionProps) {
  return (
    <section className="relative py-20 lg:py-32">
      {/* content */}
    </section>
  )
}
```

**Image handling:**
- Use placeholder divs with correct aspect ratios
- Add comments with original image descriptions
- Use `aspect-video`, `aspect-square`, or custom `aspect-[W/H]`
- Apply `bg-muted` as placeholder background

**Spacing system:**
- Section padding: `py-16 lg:py-24`
- Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`
- Card gaps: `gap-6` or `gap-8`
- Stack gaps: `space-y-4` or `space-y-6`

### Phase 4: SHADCN/UI MAPPING

Map visual elements to real shadcn/ui components.
Load `references/shadcn-component-map.md` for the full mapping table.

**Core mapping rules:**

| Visual Element | shadcn Component | Import |
|---------------|-----------------|--------|
| Primary button | `Button` | `@/components/ui/button` |
| Outline button | `Button variant="outline"` | `@/components/ui/button` |
| Text input | `Input` | `@/components/ui/input` |
| Dropdown | `Select` | `@/components/ui/select` |
| Card container | `Card` + sub-components | `@/components/ui/card` |
| Modal/popup | `Dialog` + sub-components | `@/components/ui/dialog` |
| Data table | `Table` + sub-components | `@/components/ui/table` |
| Tabs | `Tabs` + sub-components | `@/components/ui/tabs` |
| Accordion/FAQ | `Accordion` + sub-components | `@/components/ui/accordion` |
| Badge/tag | `Badge` | `@/components/ui/badge` |
| Separator | `Separator` | `@/components/ui/separator` |
| Avatar | `Avatar` + sub-components | `@/components/ui/avatar` |

**cn() usage:**

```tsx
import { cn } from "@/lib/utils"

<Button className={cn("w-full", isPrimary && "bg-primary")}>
  {label}
</Button>
```

**When NO shadcn component fits:**
- Build custom component in `src/components/sections/`
- Use Tailwind classes directly
- Follow shadcn patterns (forwardRef, cn(), variant props via cva)

### Phase 5: PROJECT SETUP

Generate Tailwind v4 + shadcn/ui configuration.
Load `references/tailwind-v4-setup.md` for the complete Four-Step Architecture.

**CRITICAL RULES:**
- NEVER create `tailwind.config.ts` (v4 does not use it)
- CSS variables MUST use `hsl()` wrapper
- `@theme inline` is MANDATORY for utility class generation
- `:root` and `.dark` at root level, NOT inside `@layer base`
- `components.json` must have `"config": ""` for v4

**Color extraction:**
Replace default color values in `:root` and `.dark` with colors extracted from the original design. Map to semantic tokens (primary, secondary, accent, muted) based on usage.

**Quando design-tokens.json disponível (modo Deep Capture):**

Substituir os valores padrão em `:root` e `.dark` pelos tokens extraídos com alta fidelidade. Os valores abaixo vêm do `design-tokens.json` gerado pela Phase 0.

1. **Cores (`:root` e `.dark`):** Mapear `colors.semantic_mapping` para as variáveis CSS do shadcn/ui:
   - `colors.semantic_mapping.primary` → `--primary`
   - `colors.semantic_mapping.secondary` → `--secondary`
   - `colors.semantic_mapping.background` → `--background`
   - `colors.semantic_mapping.foreground` → `--foreground`
   - `colors.semantic_mapping.muted` → `--muted`
   - `colors.semantic_mapping.accent` → `--accent`
   - Usar o campo `.hsl` de cada ColorRef para o formato `hsl()` exigido pelo shadcn/ui
   - Se `colors.semantic_mapping` não disponível, usar `colors.palette` (primeira entrada) como primary e aplicar lógica de contraste para foreground (consultar `colors.contrast_pairs` para validação WCAG)
   - Se `colors.dark_mode.enabled` for `true`, mapear `colors.dark_mode.palette` para `.dark`

2. **Tipografia (`@font-face` + `@theme inline`):** Para cada entrada em `typography.font_families` com confidence `"ALTA"` ou `"MEDIA"`:
   ```css
   /* Quando source = "google": gerar link para Google Fonts */
   /* Quando source = "custom": gerar @font-face com URL original */
   @font-face {
     font-family: '{family}';
     src: url('{source_url}') format('woff2');
     font-weight: {weight_range[0]} {weight_range[-1]};
     font-display: swap;
   }
   ```
   - Usar `typography.font_families` com `usage: "heading"` para `--font-heading`
   - Usar `typography.font_families` com `usage: "body"` para `--font-body`
   - Usar `typography.font_families` com `usage: "mono"` para `--font-mono`
   - Aplicar `typography.scale` para informar os valores de `--font-size-*` no `@theme inline`
   - Nota: DC-008 implementará o download real dos arquivos de fonte. Em DC-006, referenciar a URL original

3. **Espaçamento (`@theme inline`):** Se `spacing.base_unit` disponível:
   - Ajustar a escala de espaçamento para alinhar com o base unit do site (ex: `4px` ou `8px`)
   - Mapear `spacing.scale` para os valores de spacing no `@theme inline`

4. **Borders (`@theme inline`):** Se `borders.radius` disponível:
   - Mapear para `--radius` e variantes (`--radius-sm`, `--radius-md`, `--radius-lg`)
   - Se `borders.width` disponível, aplicar como `--border` default

5. **Shadows:** Se `shadows` disponível:
   - Mapear shadow tokens para `--shadow-sm`, `--shadow-md`, `--shadow-lg` conforme nomes semânticos
   - Usar o campo `.value` de cada ShadowRef diretamente como valor CSS

6. **Custom properties:** Reproduzir `custom_properties` do site no `:root` para máxima fidelidade:
   - Para cada entrada, gerar `--{nome}: {value};`
   - Filtrar por `type: "color"` e adicionar ao `@theme inline` se aplicável
   - Custom properties do site complementam (não substituem) as variáveis semânticas do shadcn/ui

## Quality Rules

### Anti-AI-Slop (from web-artifacts-builder)
- NEVER use Inter, Roboto, or Open Sans as default fonts
- NEVER use generic purple/blue gradients
- NEVER apply uniform `rounded-xl` to everything
- NEVER center every single element
- DO use high-contrast font weight pairings (100-200 with 800-900)
- DO extract and preserve the original design's personality
- DO use intentional, design-specific color palettes

### Code Quality
- Every component must have a TypeScript props interface
- Use named exports, not default exports
- One component per file
- Imports sorted: React > external libs > shadcn/ui > local components > utils

### Responsiveness
- Mobile-first: base = mobile, add `md:` `lg:` for larger
- Grid columns reduce: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Navigation collapses to hamburger on mobile

### Accessibility
- All images get `alt` text (or `aria-hidden` if decorative)
- Interactive elements are keyboard accessible
- Form inputs have associated labels
- Use shadcn/ui components (built on Radix UI - accessible by default)

## Output Delivery

After generating all files, present:

1. **Summary** - What was detected and decomposed
2. **File list** - All generated files with brief description
3. **Setup commands:**
   ```bash
   npm create vite@latest {project} -- --template react-ts
   cd {project}
   npm install tailwindcss @tailwindcss/vite tw-animate-css
   npx shadcn@latest init
   npx shadcn@latest add button card [other-components-used]
   npm install clsx tailwind-merge
   npm run dev
   ```
4. **Generated code** - All component files
5. **Notes** - Assumptions made, manual adjustments needed

## Bundled Resources

- `references/shadcn-component-map.md` - Complete visual-to-shadcn mapping with variants and composition
- `references/tailwind-v4-setup.md` - Four-Step Architecture with common issues and fixes
- `references/quality-rules.md` - Anti-AI-slop rules, accessibility checklist, responsive patterns
