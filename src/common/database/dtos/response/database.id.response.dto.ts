import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/** @public */
export const DatabaseIdResponseSchema = DatabaseResponseSchema.pick({
    id: true,
});

/** @public */
export type DatabaseIdResponseDto = z.infer<typeof DatabaseIdResponseSchema>;
