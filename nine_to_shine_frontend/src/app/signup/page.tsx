'use client';
import React, { useState } from 'react';
import {
  AuthError,
  AuthErrorCodes,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../../firebase';
import { Box, Button, Container, Divider, TextField } from '@mui/material';
import Layout from '@/components/Layout';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import { routes } from '@/common/routes';
import { cdwrd } from '@/common/misc';
import LoginIcon from '@mui/icons-material/Login';
import CustomTitle from '@/components/CustomTitle';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [codeWord, setCodeWord] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordConfirmError, setPasswordConfirmError] = useState<string>('');
  const [codeWordError, setCodeWordError] = useState<string>('');

  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();

  const validateEmail = () => {
    if (!email) {
      setEmailError('E-Mail ist erforderlich');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('E-Mail-Adresse ungültig');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Passwort ist erforderlich');
      return false;
    } else if (password.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validatePasswordConfirm = () => {
    if (password !== passwordConfirm) {
      setPasswordConfirmError('Die Passwörter stimmen nicht überein');
      return false;
    }
    setPasswordConfirmError('');
    return true;
  };

  const validateCodeWord = () => {
    if (codeWord !== cdwrd) {
      setCodeWordError('Code Word ist falsch');
      return false;
    }
    setCodeWordError('');
    return true;
  };

  const signUp = async () => {
    if (
      validateEmail() &&
      validatePassword() &&
      validatePasswordConfirm() &&
      validateCodeWord()
    ) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        enqueueSnackbar('Benutzer wurde erstellt.', {
          variant: 'success',
        });
        router.push(routes.home);
      } catch (error) {
        const authError = error as AuthError;
        switch (authError.code) {
          case AuthErrorCodes.EMAIL_EXISTS:
            enqueueSnackbar('E-Mail existiert bereits!', {
              variant: 'error',
            });
            break;
          default:
            enqueueSnackbar(authError.message, {
              variant: 'error',
            });
        }
      }
    }
  };

  const navigateToLogin = () => {
    router.push(routes.login);
  };

  return (
    <Layout>
      <Container>
        <CustomTitle text="Registrieren" />
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
          <TextField
            fullWidth
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Passwort bestätigen"
            error={!!passwordConfirmError}
            helperText={passwordConfirmError}
          />
          <TextField
            fullWidth
            type="text"
            value={codeWord}
            onChange={(e) => setCodeWord(e.target.value)}
            placeholder="Code Wort"
            error={!!codeWordError}
            helperText={codeWordError}
          />
        </Box>
        <Divider />
        <Box display="flex" gap={2} margin="1.5rem 0" flexDirection="column">
          <Button
            fullWidth
            variant="contained"
            onClick={signUp}
            endIcon={<VpnKeyIcon />}
          >
            Registrieren
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={navigateToLogin}
            endIcon={<LoginIcon />}
          >
            Gehe zum Login
          </Button>
        </Box>
      </Container>
    </Layout>
  );
};

export default AuthPage;
