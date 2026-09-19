import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The theme architecture is CSS variables: `:root` holds the dark theme (which also applies when no
 * theme is set) and `:root[data-theme='light']` overrides the colour and shadow tokens. These tests
 * read the real stylesheets and hold that architecture to its rules.
 */
const SRC = join(import.meta.dirname, '..')
const read = (path) => readFileSync(join(SRC, path), 'utf8')
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const tokensCss = stripComments(read('styles/tokens.css'))
const block = (selector) => {
  const start = tokensCss.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No ${selector} block`)
  return tokensCss.slice(start, tokensCss.indexOf('\n}', start))
}
function declarations(css) {
  const tokens = {}
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[match[1]] = match[2].replace(/\s+/g, ' ').trim()
  return tokens
}
const dark = declarations(block(':root'))
const light = declarations(block(":root[data-theme='light']"))

// ---- colour maths (WCAG 2.x) ----------------------------------------------------------------
function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), alpha: 1 }
  const rgba = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
  if (rgba) return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) }
  throw new Error(`Not a colour: ${value}`)
}
const over = (top, bottom) => ({ rgb: top.rgb.map((c, i) => Math.round(c * top.alpha + bottom.rgb[i] * (1 - top.alpha))), alpha: 1 })
function luminance({ rgb }) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function hue({ rgb: [r, g, b] }) {
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)]
  if (max === min) return 0
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
const color = (theme, name) => parseColor(theme[name])

describe('the dark theme is unchanged', () => {
  it('keeps every original value exactly', () => {
    expect(dark).toMatchObject({
      '--color-bg': '#0b0d12',
      '--color-surface': '#12151c',
      '--color-surface-raised': '#171b24',
      '--color-border': 'rgba(255, 255, 255, 0.08)',
      '--color-border-strong': 'rgba(255, 255, 255, 0.14)',
      '--color-text': '#e8e9ed',
      '--color-text-muted': '#9aa1ad',
      '--color-text-subtle': '#6b7280',
      '--color-accent': '#3b82f6',
      '--color-accent-hover': '#2f6fdb',
      '--color-accent-subtle': 'rgba(59, 130, 246, 0.12)',
      '--color-success': '#22c55e',
      '--color-success-subtle': 'rgba(34, 197, 94, 0.12)',
      '--color-warning': '#f59e0b',
      '--color-warning-subtle': 'rgba(245, 158, 11, 0.12)',
      '--color-danger': '#ef4444',
      '--color-danger-subtle': 'rgba(239, 68, 68, 0.12)',
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.35)',
    })
  })

  it('the overlay that used to be hard-coded has the same value it always had', () => {
    expect(dark['--color-overlay']).toBe('rgba(0, 0, 0, 0.5)')
  })

  it('keeps spacing, radius, type and motion tokens', () => {
    expect(dark).toMatchObject({ '--space-4': '16px', '--radius-md': '10px', '--text-base': '14px', '--transition-fast': '120ms ease' })
  })

  it('is the default: colours live in the plain :root block, with no attribute needed', () => {
    expect(tokensCss).toMatch(/:root\s*\{/)
    expect(Object.keys(dark).filter((name) => name.startsWith('--color-')).length).toBeGreaterThanOrEqual(18)
  })
})

describe('the light theme is complete and only overrides colour', () => {
  const colourAndShadow = (name) => name.startsWith('--color-') || name.startsWith('--shadow-')

  it('defines every colour and shadow token the dark theme defines, so nothing falls through to dark', () => {
    const missing = Object.keys(dark).filter(colourAndShadow).filter((name) => !(name in light))
    expect(missing).toEqual([])
  })

  it('defines nothing the dark theme does not (no orphan tokens)', () => {
    expect(Object.keys(light).filter((name) => !(name in dark))).toEqual([])
  })

  it('leaves spacing, radius, type and motion shared, so layout is identical in both themes', () => {
    expect(Object.keys(light).filter((name) => !colourAndShadow(name))).toEqual([])
  })

  it('really is a different theme: every surface, text and border colour differs from dark', () => {
    ;['--color-bg', '--color-surface', '--color-surface-raised', '--color-border', '--color-text', '--color-text-muted', '--color-text-subtle'].forEach(
      (name) => expect(light[name], name).not.toBe(dark[name]),
    )
  })

  it('has a light page: the background is lighter than every text colour and lighter than any dark surface', () => {
    const lum = (name) => luminance(color(light, name))
    expect(lum('--color-bg')).toBeGreaterThan(0.85)
    expect(lum('--color-surface')).toBeGreaterThanOrEqual(lum('--color-bg')) // white cards on a grey page
    expect(lum('--color-text')).toBeLessThan(0.05)
  })
})

describe('light theme readability (WCAG AA, 4.5:1)', () => {
  const surfaces = ['--color-bg', '--color-surface', '--color-surface-raised']

  it.each(['--color-text', '--color-text-muted', '--color-text-subtle'])('%s is readable on every surface', (token) => {
    surfaces.forEach((surface) => {
      expect(contrast(color(light, token), color(light, surface)), `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    })
  })

  // Found in the browser: the small "Total" label on a selected (blue-tinted) Orders summary tile.
  it.each(['--color-text', '--color-text-muted', '--color-text-subtle'])('%s stays readable on every status tint, over every surface', (token) => {
    surfaces.forEach((surface) => {
      ;['accent', 'success', 'warning', 'danger'].forEach((name) => {
        const tint = over(color(light, `--color-${name}-subtle`), color(light, surface))
        expect(contrast(color(light, token), tint), `${token} on ${name} tint over ${surface}`).toBeGreaterThanOrEqual(4.5)
      })
    })
  })

  it.each(['accent', 'success', 'warning', 'danger'])('%s text is readable on its own tinted background, wherever that sits', (name) => {
    ;['--color-surface', '--color-bg'].forEach((surface) => {
      const tint = over(color(light, `--color-${name}-subtle`), color(light, surface))
      expect(contrast(color(light, `--color-${name}`), tint), `${name} on its tint over ${surface}`).toBeGreaterThanOrEqual(4.5)
    })
  })

  it.each(['accent', 'accent-hover', 'success', 'warning', 'danger'])('white text on a %s fill is readable (buttons, badges, timeline steps)', (name) => {
    expect(contrast({ rgb: [255, 255, 255], alpha: 1 }, color(light, `--color-${name}`))).toBeGreaterThanOrEqual(4.5)
  })

  it('accent and status colours are readable as plain text on white cards', () => {
    ;['accent', 'success', 'warning', 'danger'].forEach((name) => {
      expect(contrast(color(light, `--color-${name}`), color(light, '--color-surface')), name).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('borders are visible against both the page and the cards, but still subtle', () => {
    ;['--color-bg', '--color-surface'].forEach((surface) => {
      const line = over(color(light, '--color-border'), color(light, surface))
      const strong = over(color(light, '--color-border-strong'), color(light, surface))
      const ratio = contrast(line, color(light, surface))
      expect(ratio, `border on ${surface}`).toBeGreaterThan(1.1)
      expect(ratio, `border on ${surface}`).toBeLessThan(2)
      expect(contrast(strong, color(light, surface))).toBeGreaterThan(ratio)
    })
  })

  it('the hover surface is distinguishable from a white card', () => {
    expect(contrast(color(light, '--color-surface-raised'), color(light, '--color-surface'))).toBeGreaterThan(1.05)
  })
})

describe('design rules', () => {
  it.each([
    ['dark', dark],
    ['light', light],
  ])('%s: no purple anywhere in the accent or status colours', (_name, theme) => {
    ;['accent', 'accent-hover', 'success', 'warning', 'danger'].forEach((name) => {
      const h = hue(color(theme, `--color-${name}`))
      expect(h < 250 || h > 330, `--color-${name} has hue ${Math.round(h)}`).toBe(true)
    })
  })

  it('the accent is blue, success green, warning amber and danger red, in both themes', () => {
    ;[dark, light].forEach((theme) => {
      expect(hue(color(theme, '--color-accent'))).toBeGreaterThan(200)
      expect(hue(color(theme, '--color-accent'))).toBeLessThan(240)
      expect(hue(color(theme, '--color-success'))).toBeGreaterThan(120)
      expect(hue(color(theme, '--color-success'))).toBeLessThan(160)
      expect(hue(color(theme, '--color-warning'))).toBeGreaterThan(20)
      expect(hue(color(theme, '--color-warning'))).toBeLessThan(45)
      const danger = hue(color(theme, '--color-danger'))
      expect(danger < 15 || danger > 350).toBe(true)
    })
  })

  it('shadows stay subtle in light mode (no more opaque than the dark theme’s)', () => {
    const alphas = (value) => Array.from(value.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)).map((m) => Number(m[1]))
    ;['--shadow-sm', '--shadow-md'].forEach((name) => {
      expect(Math.max(...alphas(light[name])), name).toBeLessThanOrEqual(Math.max(...alphas(dark[name])))
    })
  })

  const cssFiles = readdirSync(SRC, { recursive: true }).filter((file) => String(file).endsWith('.css')).map(String)

  it('finds the stylesheets it is checking', () => {
    expect(cssFiles.length).toBeGreaterThan(40)
  })

  it('uses no gradients and no frosted glass in any stylesheet', () => {
    cssFiles.forEach((file) => {
      const css = stripComments(read(file))
      expect(css, file).not.toMatch(/gradient\(/)
      expect(css, file).not.toMatch(/backdrop-filter/)
    })
  })

  it('hard-codes no colours outside tokens.css, except white on a coloured fill', () => {
    const offenders = []
    cssFiles
      .filter((file) => file.replace(/\\/g, '/') !== 'styles/tokens.css')
      .forEach((file) => {
        const css = stripComments(read(file))
        for (const literal of css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
          if (literal[0].toLowerCase() !== '#fff') offenders.push(`${file}: ${literal[0]}`)
        }
      })
    expect(offenders).toEqual([])
  })

  it('uses no colour literals in components or pages', () => {
    const offenders = []
    for (const file of readdirSync(SRC, { recursive: true }).map(String)) {
      if (!/\.(jsx|js)$/.test(file) || /\.test\./.test(file) || /^(data|test)[\\/]/.test(file)) continue
      for (const literal of read(file).matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])|rgba?\(/g)) offenders.push(`${file}: ${literal[0]}`)
    }
    expect(offenders).toEqual([])
  })

  it('every token a stylesheet uses is defined (no typos that silently fall back)', () => {
    const undefinedUses = []
    cssFiles.forEach((file) => {
      for (const use of stripComments(read(file)).matchAll(/var\((--[\w-]+)/g)) {
        if (!(use[1] in dark)) undefinedUses.push(`${file}: ${use[1]}`)
      }
    })
    expect(undefinedUses).toEqual([])
  })
})
