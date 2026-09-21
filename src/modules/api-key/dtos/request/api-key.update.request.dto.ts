import { z } from 'zod';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

/**
 * Validates the body for renaming an API key.
 * @public
 */
export const ApiKeyUpdateRequestSchema = ApiKeyCreateBaseRequestSchema.pick({
    name: true,
});

/**
 * Body for renaming an API key.
 * @public
 */
export type ApiKeyUpdateRequestDto = z.infer<typeof ApiKeyUpdateRequestSchema>;
