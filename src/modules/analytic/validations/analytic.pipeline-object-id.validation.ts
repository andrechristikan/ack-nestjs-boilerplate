import { z } from 'zod';

/** @public */
export const AnalyticPipelineObjectIdSchema = z
    .object({ $oid: z.string() })
    .transform(value => value.$oid);
