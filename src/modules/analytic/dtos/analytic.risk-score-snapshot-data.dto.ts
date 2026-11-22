import { z } from 'zod';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticFraudRiskScore } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticRiskScoreSnapshotDataSchema = z.object({
    userId: z.string(),
    score: z.number(),
    band: z.enum(EnumAnalyticFraudBand),
    contributingSignalCodes: z.array(
        z.enum(EnumAnalyticFraudContributingSignal)
    ),
}) satisfies z.ZodType<IAnalyticFraudRiskScore>;

/** @public */
export type AnalyticRiskScoreSnapshotDataDto = z.infer<
    typeof AnalyticRiskScoreSnapshotDataSchema
>;
