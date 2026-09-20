import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Response shape exposing only the document `id`, for create/mutation results.
 * @public
 */
export const DatabaseIdResponseSchema = DatabaseResponseSchema.pick({
    id: true,
});

/**
 * Document id returned by a create or mutation route.
 * @public
 */
export type DatabaseIdResponseDto = z.infer<typeof DatabaseIdResponseSchema>;
