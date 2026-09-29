'use client'

import { alpha, createTheme } from '@mui/material/styles'

const brand = {
  main: '#5b5bd6',
  light: '#8b8bf0',
  dark: '#4040b0'
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { ...brand, contrastText: '#fff' },
        secondary: { main: '#0ea5a4' },
        success: { main: '#16a34a' },
        warning: { main: '#f59e0b' },
        error: { main: '#e5484d' },
        info: { main: '#0b8ae6' },
        background: { default: '#f5f6fb', paper: '#ffffff' },
        text: { primary: '#1c2033', secondary: '#646a85' },
        divider: '#e6e8f0'
      }
    },
    dark: {
      palette: {
        primary: { main: '#9d9dff', light: '#c0c0ff', dark: '#7070e0', contrastText: '#0f1020' },
        secondary: { main: '#2dd4bf' },
        success: { main: '#3fcf8e' },
        warning: { main: '#fbbf24' },
        error: { main: '#ff6369' },
        info: { main: '#52a9ff' },
        background: { default: '#0d0f1a', paper: '#151827' },
        text: { primary: '#eceef8', secondary: '#9aa0bd' },
        divider: '#262a3d'
      }
    }
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'var(--font-sans), "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased' },
        code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.85em' }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16 },
        sizeSmall: { paddingInline: 12 }
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: ({ theme }) => ({
            backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.light} -40%, ${theme.vars.palette.primary.main} 60%)`,
            boxShadow: `0 4px 14px -4px ${alpha(brand.main, 0.55)}`,
            '&:hover': { boxShadow: `0 6px 18px -4px ${alpha(brand.main, 0.65)}` },
            '&.Mui-disabled': { backgroundImage: 'none', boxShadow: 'none' }
          })
        }
      ]
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.04)'
        })
      }
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 8 } }
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          backgroundColor: theme.vars.palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.divider },
          '&:hover:not(.Mui-focused):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.text.disabled
          },
          '&.Mui-disabled': { backgroundColor: theme.vars.palette.action.hover },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.divider
          }
        })
      }
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500, borderRadius: 8 } }
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        head: ({ theme }) => ({
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: theme.vars.palette.text.secondary,
          backgroundColor: theme.vars.palette.background.default
        })
      }
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 8 } }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&:first-of-type': { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
          '&:last-of-type': { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
          '&::before': { display: 'none' }
        }
      }
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8, alignItems: 'center' } }
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } }
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 8 } }
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 8, boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.25)' }
      }
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 3 } }
    }
  }
})

export default theme
