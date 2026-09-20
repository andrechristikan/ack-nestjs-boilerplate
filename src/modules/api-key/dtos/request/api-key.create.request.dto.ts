import { z } from 'zod';
import { ApiKeyCreateBaseRequestSchema } from '@modules/api-key/dtos/request/api-key.create-base.request.dto';

/**
 * Validates the body for creating an API key, including its date window.
 * @public
 */
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

/**
 * Body for creating an API key.
 * @public
 */
export type ApiKeyCreateRequestDto = z.infer<typeof ApiKeyCreateRequestSchema>;
