import { z } from 'zod';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create.request.dto';

export const ApiKeyUpdateRequestSchema = ApiKeyCreateBaseRequestSchema.pick({
    name: true,
});

export type ApiKeyUpdateRequestDto = z.infer<typeof ApiKeyUpdateRequestSchema>;
