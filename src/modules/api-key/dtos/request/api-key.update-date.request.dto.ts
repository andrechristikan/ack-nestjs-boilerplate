import { z } from 'zod';
import { ApiKeyDateRequestSchema } from '@modules/api-key/dtos/request/api-key.date.request.dto';

/**
 * Validates the body for changing the validity dates of an API key.
 * @public
 */
export const ApiKeyUpdateDateRequestSchema =
    ApiKeyDateRequestSchema.superRefine(({ startAt, endAt }, ctx) => {
        if (endAt < startAt) {
            ctx.addIssue({
                code: 'custom',
                path: ['endAt'],
                message: 'request.error.greaterThanEqualOtherProperty.invalid',
            });
        }
    });

/**
 * Body for changing the validity dates of an API key.
 * @public
 */
export type ApiKeyUpdateDateRequestDto = z.infer<
    typeof ApiKeyUpdateDateRequestSchema
>;
