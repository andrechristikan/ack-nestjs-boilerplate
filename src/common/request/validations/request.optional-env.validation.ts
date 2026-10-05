import { z } from 'zod';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';
import { RequestSesIdentityArnSchema } from '@common/request/validations/request.ses-identity-arn.validation';
import { RequestUrlNoTrailingSlashSchema } from '@common/request/validations/request.url-no-trailing-slash.validation';

const isBlankEnv = (value: unknown): boolean => value === '';

/**
 * Reads an optional env value for config: an absent value and an empty string
 * (a blank `.env` line) both read as `null`.
 */
export const readOptionalEnv = (value: string | undefined): string | null =>
    isBlankEnv(value) ? null : (value ?? null);

/**
 * Wraps an env schema so a third-party key is optional: an absent value and an
 * empty string (a blank `.env` line) both parse to `undefined`; any other
 * value must satisfy `schema`.
 * @public
 */
export const RequestOptionalEnvSchema = <T extends z.ZodType>(
    schema: T
): z.ZodPipe<z.core.$ZodTransform<unknown, unknown>, z.ZodOptional<T>> =>
    z.preprocess(
        value => (isBlankEnv(value) ? undefined : value),
        schema.optional()
    );

export const RequestOptionalEnvStringSchema = RequestOptionalEnvSchema(
    RequestRequiredStringSchema
);

export const RequestOptionalEnvEmailSchema = RequestOptionalEnvSchema(
    z.string().superRefine((value, ctx) => {
        const validation = validateEmail(value);
        if (!validation.validated) {
            ctx.addIssue({
                code: 'custom',
                message: validation.messagePath,
            });
        }
    })
);

export const RequestOptionalEnvSesIdentityArnSchema = RequestOptionalEnvSchema(
    RequestSesIdentityArnSchema
);

export const RequestOptionalEnvUrlNoTrailingSlashSchema =
    RequestOptionalEnvSchema(RequestUrlNoTrailingSlashSchema);
