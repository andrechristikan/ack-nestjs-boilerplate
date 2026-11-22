import { z } from 'zod';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticSharedFingerprintSnapshotDataSchema = z.object({
    fingerprint: z.string(),
    userCount: z.number(),
    userIds: z.array(z.string()),
}) satisfies z.ZodType<IAnalyticSharedFingerprint>;

/** @public */
export type AnalyticSharedFingerprintSnapshotDataDto = z.infer<
    typeof AnalyticSharedFingerprintSnapshotDataSchema
>;
