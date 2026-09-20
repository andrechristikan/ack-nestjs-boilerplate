import { z } from 'zod';

/**
 * Validates the metadata of an admin user import row.
 * @public
 */
export const ActivityLogImportMetadataSchema = z.strictObject({
    userCount: z.number(),
});

/**
 * Metadata of an admin user import row.
 * @public
 */
export type ActivityLogImportMetadataDto = z.infer<
    typeof ActivityLogImportMetadataSchema
>;
