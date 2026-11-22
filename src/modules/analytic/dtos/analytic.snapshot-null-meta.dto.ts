import { z } from 'zod';

/** @public */
export const AnalyticSnapshotNullMetaSchema = z.null();

/** @public */
export type AnalyticSnapshotNullMetaDto = z.infer<
    typeof AnalyticSnapshotNullMetaSchema
>;
