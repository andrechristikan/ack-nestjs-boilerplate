import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyDateRequestSchema } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';

/**
 * The api-key creation fields without the cross-field date rule, so a derived request can cut from them.
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

export const ApiKeyCreateRequestSchema =
    ApiKeyCreateBaseRequestSchema.superRefine(({ startAt, endAt }, ctx) => {
        if (startAt !== undefined && endAt !== undefined && endAt < startAt) {
            ctx.addIssue({
                code: 'custom',
                path: ['endAt'],
                message: 'request.error.greaterThanEqualOtherProperty.invalid',
            });
        }
    });

export type ApiKeyCreateRequestDto = z.infer<typeof ApiKeyCreateRequestSchema>;
