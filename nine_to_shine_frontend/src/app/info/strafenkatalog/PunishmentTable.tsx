import { punishmentRules } from './punishment-data';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

const tableHeaderSx = {
  bgcolor: 'primary.main',
  '& .MuiTableCell-head': {
    color: 'primary.contrastText',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
};

export default function PunishmentTable() {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Strafenkatalog" sx={{ minWidth: 640 }}>
        <TableHead sx={tableHeaderSx}>
          <TableRow>
            <TableCell>Vergehen</TableCell>
            <TableCell>Betrag</TableCell>
            <TableCell>Bemerkung</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {punishmentRules.map((punishment) => (
            <TableRow key={punishment.id}>
              <TableCell>{punishment.vergehen}</TableCell>
              <TableCell>{punishment.betrag} €</TableCell>
              <TableCell>{punishment.bemerkung}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
