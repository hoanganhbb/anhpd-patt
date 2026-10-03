import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { cardAnatomy, tableAnatomy, tabsAnatomy } from '@chakra-ui/react/anatomy'

// Clean look: soft neutrals, a teal accent, rounded corners and gentle shadows.
const config = defineConfig({
  globalCss: {
    // Every component uses the brand colour unless it sets its own colorPalette.
    html: { colorPalette: 'brand' },
    body: { bg: 'bg', color: 'fg' },
    code: {
      fontFamily: 'mono',
      fontSize: '0.85em',
      px: '1.5',
      py: '0.5',
      borderRadius: 'l1',
      bg: 'bg.muted'
    },
    '::selection': { bg: 'brand.muted' }
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: 'var(--font-sans), "Segoe UI", Roboto, Arial, sans-serif' },
        body: { value: 'var(--font-sans), "Segoe UI", Roboto, Arial, sans-serif' },
        mono: { value: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
      },
      colors: {
        // Warm stone replaces Chakra's cool gray, so every derived neutral token turns warm.
        gray: {
          50: { value: '#fafaf9' },
          100: { value: '#f5f5f4' },
          200: { value: '#e7e5e4' },
          300: { value: '#d6d3d1' },
          400: { value: '#a8a29e' },
          500: { value: '#78716c' },
          600: { value: '#57534e' },
          700: { value: '#44403c' },
          800: { value: '#292524' },
          900: { value: '#1c1917' },
          950: { value: '#0f0d0c' }
        },
        brand: {
          50: { value: '#effcf9' },
          100: { value: '#cdf4eb' },
          200: { value: '#9be8d8' },
          300: { value: '#62d3c0' },
          400: { value: '#33b8a6' },
          500: { value: '#1a9b8c' },
          600: { value: '#127c71' },
          700: { value: '#12635c' },
          800: { value: '#134f4b' },
          900: { value: '#14423f' },
          950: { value: '#052625' }
        }
      }
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: { _light: '{colors.brand.600}', _dark: '{colors.brand.400}' } },
          contrast: { value: { _light: 'white', _dark: '{colors.brand.950}' } },
          fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
          muted: { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
          subtle: { value: { _light: '{colors.brand.50}', _dark: '{colors.brand.950}' } },
          emphasized: { value: { _light: '{colors.brand.200}', _dark: '{colors.brand.800}' } },
          focusRing: { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' } }
        },
        bg: {
          DEFAULT: { value: { _light: '#f4f6f5', _dark: '#121413' } },
          panel: { value: { _light: 'white', _dark: '#1a1d1c' } },
          sidebar: { value: { _light: 'white', _dark: '#161918' } }
        },
        fg: {
          DEFAULT: { value: { _light: '{colors.gray.800}', _dark: '{colors.gray.100}' } }
        },
        border: {
          DEFAULT: { value: { _light: '#e5e9e7', _dark: '#2a2f2d' } }
        }
      },
      radii: {
        l1: { value: '6px' },
        l2: { value: '10px' },
        l3: { value: '12px' }
      },
      shadows: {
        soft: {
          value: {
            _light: '0 1px 2px rgba(41, 37, 36, 0.04), 0 4px 16px -6px rgba(41, 37, 36, 0.08)',
            _dark: '0 1px 2px rgba(0, 0, 0, 0.3)'
          }
        },
        lifted: {
          value: {
            _light: '0 1px 2px rgba(41, 37, 36, 0.06), 0 1px 1px rgba(41, 37, 36, 0.04)',
            _dark: '0 1px 2px rgba(0, 0, 0, 0.4)'
          }
        }
      }
    },
    // Keep disabled controls readable (Chakra default is 0.5).
    layerStyles: {
      disabled: { value: { opacity: '0.7', cursor: 'not-allowed' } }
    },
    slotRecipes: {
      card: {
        slots: cardAnatomy.keys(),
        base: { root: { borderRadius: 'l3' } },
        variants: {
          variant: {
            outline: {
              root: { bg: 'bg.panel', borderColor: 'border', boxShadow: 'soft' }
            }
          }
        }
      },
      table: {
        slots: tableAnatomy.keys(),
        base: {
          columnHeader: {
            fontSize: 'xs',
            fontWeight: 'medium',
            color: 'fg.muted',
            bg: 'bg.panel'
          },
          cell: { borderColor: 'border' }
        }
      },
      tabs: {
        slots: tabsAnatomy.keys(),
        variants: {
          variant: {
            // Segmented control: a muted track with the active tab raised on a white chip.
            enclosed: {
              list: { bg: 'bg.muted', borderRadius: 'l2', p: '1' },
              trigger: {
                borderRadius: 'l1',
                color: 'fg.muted',
                _selected: { bg: 'bg.panel', color: 'fg', boxShadow: 'lifted' }
              }
            }
          }
        }
      }
    }
  }
})

const system = createSystem(defaultConfig, config)

export default system
