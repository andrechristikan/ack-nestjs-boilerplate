import { z } from 'zod';

/**
 * Validates activity-log metadata that must be empty.
 * @public
 */
export const ActivityLogEmptyMetadataSchema = z.strictObject({});

/**
 * Activity-log metadata for actions that carry none.
 * @public
 */
export type ActivityLogEmptyMetadataDto = z.infer<
    typeof ActivityLogEmptyMetadataSchema
>;
