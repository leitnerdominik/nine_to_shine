import { z } from 'zod';

// Schema für eine einzelne Ausgaben-Zeile
export const expenseItemSchema = z.object({
  amount: z
    .string()
    .refine((val) => !Number.isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Betrag muss größer 0 sein',
    }),
  description: z.string().optional(),
});

// Hauptschema
export const schema = z.object({
  globalDate: z.string().min(1, 'Datum erforderlich'),
  seasonId: z.number().min(1, 'Saison erforderlich'),
  gameId: z.number().optional(),
  items: z
    .array(expenseItemSchema)
    .min(1, 'Mindestens eine Ausgabe erforderlich'),
});

export type FormInput = z.input<typeof schema>;
