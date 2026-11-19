import { AnalyticFraudRiskScoresRequestSchema } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';
import { AnalyticSnapshotListRequestSchema } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import type { z } from 'zod';

/** @public */
export const AnalyticFraudRiskScoresListRequestSchema =
    AnalyticSnapshotListRequestSchema.extend(
        AnalyticFraudRiskScoresRequestSchema.shape
    );

/** @public */
export type AnalyticFraudRiskScoresListRequestDto = z.infer<
    typeof AnalyticFraudRiskScoresListRequestSchema
>;
