import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Response shape exposing only the document `id`, for create/mutation results.
 */
export const DatabaseIdResponseSchema = DatabaseResponseSchema.pick({
    id: true,
});

export type DatabaseIdResponseDto = z.infer<typeof DatabaseIdResponseSchema>;
