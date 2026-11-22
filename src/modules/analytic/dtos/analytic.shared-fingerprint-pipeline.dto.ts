import { z } from 'zod';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

/** @public */
export const AnalyticSharedFingerprintPipelineSchema = z.array(
    z.object({
        fingerprint: z.string(),
        userCount: z.number(),
        userIds: z.array(AnalyticPipelineObjectIdSchema),
    })
) satisfies z.ZodType<IAnalyticSharedFingerprint[]>;

/** @public */
export type AnalyticSharedFingerprintPipelineDto = z.infer<
    typeof AnalyticSharedFingerprintPipelineSchema
>;
