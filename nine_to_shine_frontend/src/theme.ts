// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0496FF', // Your primary color
    },
    secondary: {
      main: '#006BA6', // Your secondary color
    },
    text: {
      primary: '#000',
      secondary: '#888',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    // Customize other typography options as needed
  },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(0,0,0,0.6)', // unfocused label
          '&.Mui-disabled': { color: 'rgba(0,0,0,0.38)' },
          '&.Mui-focused': { color: '#0496FF' }, // focused label color
          '&.Mui-error': { color: '#d32f2f' },
        },
      },
    },
  },
});

export default theme;
