import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumApiKeyType } from '@generated/prisma-client/client';
import { ApiKeyDateRequestSchema } from '@modules/api-key/dtos/request/api-key.date.request.dto';

/**
 * The api-key creation fields without the cross-field date rule, so a derived request can cut from them.
 * @public
 */
export const ApiKeyCreateBaseRequestSchema =
    ApiKeyDateRequestSchema.partial().extend({
        name: z.string().min(1).max(100).meta({
            description: 'Api Key name',
            example: faker.company.name(),
        }),
        type: z.enum(EnumApiKeyType).meta({
            description: 'Api Key type',
            example: EnumApiKeyType.default,
        }),
    });

/**
 * Api key creation fields without the cross-field date rule.
 * @public
 */
export type ApiKeyCreateBaseRequestDto = z.infer<
    typeof ApiKeyCreateBaseRequestSchema
>;
