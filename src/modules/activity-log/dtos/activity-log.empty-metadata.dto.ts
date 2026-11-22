import { z } from 'zod';

/** @public */
export const ActivityLogEmptyMetadataSchema = z.strictObject({});

/** @public */
export type ActivityLogEmptyMetadataDto = z.infer<
    typeof ActivityLogEmptyMetadataSchema
>;
