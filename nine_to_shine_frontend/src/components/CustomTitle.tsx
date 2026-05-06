import React from 'react';
import { Typography } from '@mui/material';

interface TitleProps {
  text: string;
}

const Title: React.FC<TitleProps> = ({ text }) => {
  return (
    <Typography variant="h4" component="h1" color="primary" gutterBottom>
      {text}
    </Typography>
  );
};

export default Title;
