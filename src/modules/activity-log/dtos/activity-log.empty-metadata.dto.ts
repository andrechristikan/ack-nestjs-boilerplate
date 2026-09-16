import { z } from 'zod';

export const ActivityLogEmptyMetadataSchema = z.strictObject({});

export type ActivityLogEmptyMetadataDto = z.infer<
    typeof ActivityLogEmptyMetadataSchema
>;
