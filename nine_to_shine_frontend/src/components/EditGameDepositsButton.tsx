import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import Link from 'next/link';

interface EditGameDepositsButtonProps {
  gameId: number;
}

export default function EditGameDepositsButton({
  gameId,
}: EditGameDepositsButtonProps) {
  return (
    <Button
      component={Link}
      href={`/finance/deposit?editGameId=${gameId}`}
      variant="outlined"
      startIcon={<EditIcon />}
    >
      Bearbeiten
    </Button>
  );
}
