import { z } from 'zod';

export const STD_MEMBER = '30';
export const STD_CLUB = '20';

// 1. Schema für Mitgliedsbeiträge
export const entrySchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  useStandard: z.boolean(),
  hasPaid: z.boolean(),
  description: z.string().optional(),
  memberAmount: z.string().refine((val) => !Number.isNaN(parseFloat(val)), {
    message: 'Muss eine Zahl sein',
  }),
  clubAmount: z.string().refine((val) => !Number.isNaN(parseFloat(val)), {
    message: 'Muss eine Zahl sein',
  }),
});

// 2. Schema für Sonstige Einnahmen
export const otherIncomeItemSchema = z.object({
  amount: z.string().optional(),
  description: z.string().optional(),
});

// 3. Hauptschema
export const schema = z.object({
  globalDate: z.string().min(1, 'Datum erforderlich'),
  seasonId: z.number().min(1, 'Saison erforderlich'),
  gameId: z.number().optional(),
  entries: z.array(entrySchema),
  otherIncomes: z.array(otherIncomeItemSchema),
});

export type FormInput = z.input<typeof schema>;
