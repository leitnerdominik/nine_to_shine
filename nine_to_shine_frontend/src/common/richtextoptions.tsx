import { Block, BLOCKS, Inline, MARKS } from '@contentful/rich-text-types';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import Image from 'next/image';

export const options = {
  renderMark: {
    [MARKS.BOLD]: (text: React.ReactNode) => <strong>{text}</strong>,
  },
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node: unknown, children: React.ReactNode) => (
      <Typography
        sx={{ margin: '1rem 0' }}
        variant="body1"
        fontWeight="inherit"
      >
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_1]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h1" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_2]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h2" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_3]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h3" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_4]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h4" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_5]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h5" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.HEADING_6]: (node: unknown, children: React.ReactNode) => (
      <Typography variant="h6" color="primary" gutterBottom>
        {children}
      </Typography>
    ),
    [BLOCKS.TABLE]: (node: unknown, children: React.ReactNode) => (
      <TableContainer sx={{ my: 2 }} component={Paper}>
        <Table>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
    ),
    [BLOCKS.TABLE_ROW]: (node: unknown, children: React.ReactNode) => (
      <TableRow>{children}</TableRow>
    ),
    [BLOCKS.TABLE_CELL]: (node: unknown, children: React.ReactNode) => (
      <TableCell>{children}</TableCell>
    ),
    [BLOCKS.TABLE_HEADER_CELL]: (node: unknown, children: React.ReactNode) => (
      <TableCell
        sx={{
          fontWeight: 700,
          background: '#0496FF',
          color: '#fff',
          fontSize: '1.1rem',
        }}
      >
        {children}
      </TableCell>
    ),
    [BLOCKS.EMBEDDED_ASSET]: (node: Block | Inline) => {
      return (
        <Image
          src={`https://${node.data.target.fields.file.url}`}
          height={node.data.target.fields.file.details.image.height}
          width={node.data.target.fields.file.details.image.width}
          alt={node.data.target.fields.description}
        />
      );
    },
    // Add more renderNode options as needed
  },
};
