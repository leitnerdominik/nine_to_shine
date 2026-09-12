import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0496FF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#006BA6',
    },
    text: {
      primary: '#07112F',
      secondary: '#607091',
    },
    background: {
      default: '#F6FAFF',
      paper: '#FFFFFF',
    },
    divider: '#DCE5F0',
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontWeight: 800,
      lineHeight: 1.12,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontWeight: 600,
      lineHeight: 1.25,
    },
    overline: {
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: '0.12em',
    },
  },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&.Mui-disabled': { color: theme.palette.text.disabled },
          '&.Mui-focused': { color: theme.palette.primary.main },
          '&.Mui-error': { color: theme.palette.error.main },
        }),
      },
    },
  },
});

export default theme;
