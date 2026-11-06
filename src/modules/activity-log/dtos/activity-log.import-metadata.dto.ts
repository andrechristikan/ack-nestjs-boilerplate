import { z } from 'zod';

/** @public */
export const ActivityLogImportMetadataSchema = z.strictObject({
    userCount: z.number(),
});

/** @public */
export type ActivityLogImportMetadataDto = z.infer<
    typeof ActivityLogImportMetadataSchema
>;
