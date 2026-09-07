import { z } from 'zod';

export const RANKING_POINTS_MIN = 0;
export const RANKING_POINTS_MAX = 10;

export const rankingPointsInputSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce
    .number()
    .int('Nur ganze Zahlen.')
    .min(RANKING_POINTS_MIN, `Mindestens ${RANKING_POINTS_MIN} Punkte.`)
    .max(RANKING_POINTS_MAX, `Maximal ${RANKING_POINTS_MAX} Punkte.`)
);
