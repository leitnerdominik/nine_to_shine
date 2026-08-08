import { z } from 'zod';

export const STD_MEMBER = '30';
export const STD_CLUB = '20';

const isMoneyAmount = (value: string, allowZero: boolean) => {
  const amount = Number(value);
  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0) &&
    Math.abs(Math.round(amount * 100) - amount * 100) < 1e-8
  );
};

// 1. Schema für Mitgliedsbeiträge
export const entrySchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  useStandard: z.boolean(),
  hasPaid: z.boolean(),
  description: z.string().optional(),
  memberAmount: z.string().refine((val) => isMoneyAmount(val, true), {
    message: 'Muss ein nichtnegativer Betrag mit maximal zwei Nachkommastellen sein',
  }),
  clubAmount: z.string().refine((val) => isMoneyAmount(val, true), {
    message: 'Muss ein nichtnegativer Betrag mit maximal zwei Nachkommastellen sein',
  }),
});

// 2. Schema für Sonstige Einnahmen
export const otherIncomeItemSchema = z.object({
  amount: z
    .string()
    .optional()
    .refine((val) => !val || isMoneyAmount(val, false), {
      message: 'Muss ein positiver Betrag mit maximal zwei Nachkommastellen sein',
    }),
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
