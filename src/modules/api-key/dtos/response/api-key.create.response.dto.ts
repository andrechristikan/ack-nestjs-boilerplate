import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { ApiKeyResponseSchema } from '@modules/api-key/dtos/response/api-key.response.dto';

/** @public */
export const ApiKeyCreateResponseSchema = ApiKeyResponseSchema.extend({
    secret: z.string().meta({
        description: 'Secret key of ApiKey, only show at once',
        example: faker.string.alphanumeric(20),
    }),
});

/** @public */
export type ApiKeyCreateResponseDto = z.infer<
    typeof ApiKeyCreateResponseSchema
>;
