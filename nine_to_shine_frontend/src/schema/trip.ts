import { z } from 'zod';

// Helper für Währung (wird in Page und Component genutzt)
export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    val
  );

export const participantSchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  isOnTrip: z.boolean(), // Fährt mit (Basis-Kosten)
  isDoingActivity: z.boolean(), // Macht Aktivität (Extra-Kosten)
});

export const schema = z.object({
  globalDate: z.string().min(1, 'Datum erforderlich'),
  seasonId: z.number().min(1, 'Saison erforderlich'),
  description: z.string().optional(),
  activityName: z.string().optional(),
  baseCostTotal: z
    .string()
    .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Betrag ungültig',
    }),
  activityCostTotal: z
    .string()
    .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Betrag ungültig',
    }),
  participants: z.array(participantSchema),
});

export type FormInput = z.input<typeof schema>;
export type FormOutput = z.output<typeof schema>;
