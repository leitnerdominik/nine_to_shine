'use client';
import React, { useState } from 'react';
import {
  AuthError,
  AuthErrorCodes,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../../firebase';
import { Box, Button, Container, Divider, TextField } from '@mui/material';
import Layout from '@/components/Layout';
import LoginIcon from '@mui/icons-material/Login';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { routes } from '@/common/routes';
import CustomTitle from '@/components/CustomTitle';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const router = useRouter();

  const { enqueueSnackbar } = useSnackbar();

  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required.');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email address is invalid.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Password is required.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const signIn = async () => {
    if (validateEmail() && validatePassword()) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        enqueueSnackbar('Anmeldung erfolgreich!', {
          variant: 'success',
        });
        router.push(routes.home);
      } catch (error) {
        const authError = error as AuthError;
        switch (authError.code) {
          case AuthErrorCodes.INVALID_PASSWORD:
            setPasswordError('Falsches Passwort');
            break;
          case AuthErrorCodes.USER_DELETED:
            setEmailError('Kein Konto mit dieser E-Mail Adresse gefunden');
            break;
          case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
            enqueueSnackbar('Falsche Anmeldedaten', {
              variant: 'error',
            });
            break;
          default:
            enqueueSnackbar(`${authError.message}`, {
              variant: 'error',
            });
            break;
        }
      }
    }
  };

  return (
    <Layout>
      <Container>
        <CustomTitle text="Login " />
        <Box display="flex" flexDirection="column" margin="1.5rem 0" gap={2}>
          <TextField
            fullWidth
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            error={!!emailError}
            helperText={emailError}
          />
          <TextField
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            error={!!passwordError}
            helperText={passwordError}
          />
        </Box>
        <Divider />
        <Box display="flex" gap={2} margin="1.5rem 0" flexDirection="column">
          <Button
            fullWidth
            variant="contained"
            onClick={signIn}
            endIcon={<LoginIcon />}
          >
            Anmelden
          </Button>
        </Box>
      </Container>
    </Layout>
  );
};

export default AuthPage;
