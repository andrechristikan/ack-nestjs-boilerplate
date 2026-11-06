import { z } from 'zod';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

/** @public */
export const ApiKeyUpdateRequestSchema = ApiKeyCreateBaseRequestSchema.pick({
    name: true,
});

/** @public */
export type ApiKeyUpdateRequestDto = z.infer<typeof ApiKeyUpdateRequestSchema>;
