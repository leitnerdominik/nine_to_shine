import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  type DefaultValues,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';

import { rankingPointsInputSchema } from '@/schema/ranking';

const rankedGameEntrySchema = z.object({
  userId: z.number().int().min(1, 'Ungültiger Spieler.'),
  isPresent: z.boolean(),
  points: rankingPointsInputSchema,
});

export const rankedGameFormSchema = z.object({
  seasonId: z.number().int().min(1, 'Bitte Saison wählen.'),
  playedAt: z
    .string()
    .min(1, 'Bitte Datum wählen.')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Ungültiges Datum.',
    }),
  gameName: z.string().min(1, 'Bitte Spielname eingeben.').max(200, 'Zu lang.'),
  organizedByUserId: z.number().int().min(1, 'Bitte Organisator wählen.'),
  entries: z
    .array(rankedGameEntrySchema)
    .min(1, 'Es wurden keine Spieler gefunden.'),
});

export type RankedGameFormInput = z.input<typeof rankedGameFormSchema>;
export type RankedGameFormOutput = z.output<typeof rankedGameFormSchema>;
export type RankedGameFormApi = UseFormReturn<
  RankedGameFormInput,
  unknown,
  RankedGameFormOutput
>;

export function useRankedGameForm(
  defaultValues: DefaultValues<RankedGameFormInput>
): RankedGameFormApi {
  return useForm<RankedGameFormInput, unknown, RankedGameFormOutput>({
    resolver: zodResolver(rankedGameFormSchema),
    defaultValues,
    mode: 'onBlur',
  });
}
