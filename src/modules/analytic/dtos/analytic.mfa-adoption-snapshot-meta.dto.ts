import { z } from 'zod';
import type { IAnalyticMfaAdoptionCount } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticMfaAdoptionSnapshotMetaSchema = z.object({
    enabled: z.number(),
    total: z.number(),
}) satisfies z.ZodType<IAnalyticMfaAdoptionCount>;

/** @public */
export type AnalyticMfaAdoptionSnapshotMetaDto = z.infer<
    typeof AnalyticMfaAdoptionSnapshotMetaSchema
>;
