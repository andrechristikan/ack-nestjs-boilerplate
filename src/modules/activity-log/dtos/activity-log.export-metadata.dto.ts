import { z } from 'zod';

/** @public */
export const ActivityLogExportMetadataSchema = z.strictObject({
    count: z.number().int().nonnegative(),
});

/** @public */
export type ActivityLogExportMetadataDto = z.infer<
    typeof ActivityLogExportMetadataSchema
>;
