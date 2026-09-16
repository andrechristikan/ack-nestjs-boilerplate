import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumApiKeyType } from '@generated/prisma-client';

/**
 * Base api-key shape: the stored api-key row without its hashed secret.
 */
export const ApiKeyResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    isActive: z.boolean().meta({
        description: 'Active flag of api key',
        example: true,
    }),
    startAt: z.date().nullable().meta({
        description: 'Api Key start date',
        example: faker.date.past(),
    }),
    endAt: z.date().nullable().meta({
        description: 'Api Key end date',
        example: faker.date.future(),
    }),
    name: z.string().meta({
        description: 'Name of api key',
        example: faker.string.alpha(10),
    }),
    type: z.enum(EnumApiKeyType).meta({
        description: 'Type of api key',
        example: EnumApiKeyType.default,
    }),
    key: z.string().meta({
        description: 'Unique key of api key',
        example: faker.string.alpha(15),
    }),
});

export type ApiKeyResponseDto = z.infer<typeof ApiKeyResponseSchema>;
