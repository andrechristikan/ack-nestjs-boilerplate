import { z } from 'zod';
import { RequestEmailSchema } from '@common/request/validations/request.email.validation';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';
import { RequestSesIdentityArnSchema } from '@common/request/validations/request.ses-identity-arn.validation';
import { RequestUrlNoTrailingSlashSchema } from '@common/request/validations/request.url-no-trailing-slash.validation';

/**
 * Optional env value: an absent value and an empty string (a blank `.env` line) both parse to `null`.
 * @public
 */
export const RequestOptionalEnvSchema = z.preprocess(
    value => (value === '' ? null : (value ?? null)),
    z.string().nullable()
);

/**
 * Optional env string: blank or absent parses to `null`, a set value must be non-empty.
 * @public
 */
export const RequestOptionalEnvStringSchema = RequestOptionalEnvSchema.pipe(
    RequestRequiredStringSchema.nullable()
);

/**
 * Optional env email: blank or absent parses to `null`, a set value must be a valid email.
 * @public
 */
export const RequestOptionalEnvEmailSchema = RequestOptionalEnvSchema.pipe(
    RequestEmailSchema.nullable()
);

/**
 * Optional env SES identity ARN: blank or absent parses to `null`, a set value must be an ARN.
 * @public
 */
export const RequestOptionalEnvSesIdentityArnSchema =
    RequestOptionalEnvSchema.pipe(RequestSesIdentityArnSchema.nullable());

/**
 * Optional env URL without a trailing slash: blank or absent parses to `null`.
 * @public
 */
export const RequestOptionalEnvUrlNoTrailingSlashSchema =
    RequestOptionalEnvSchema.pipe(RequestUrlNoTrailingSlashSchema.nullable());

/**
 * Optional env URL: blank or absent parses to `null`, a set value must be an absolute URL.
 * @public
 */
export const RequestOptionalEnvUrlSchema = RequestOptionalEnvSchema.pipe(
    z.url().nullable()
);
