import { z } from 'zod';
import { RequestEmailSchema } from '@common/request/validations/request.email.validation';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';
import { RequestSesIdentityArnSchema } from '@common/request/validations/request.ses-identity-arn.validation';
import { RequestTrustedProxySchema } from '@common/request/validations/request.trusted-proxy.validation';
import { RequestUrlNoTrailingSlashSchema } from '@common/request/validations/request.url-no-trailing-slash.validation';

/** @public */
export const RequestOptionalEnvSchema = z.preprocess(
    value => (value === '' ? null : (value ?? null)),
    z.string().nullable()
);

/** @public */
export const RequestOptionalEnvStringSchema = RequestOptionalEnvSchema.pipe(
    RequestRequiredStringSchema.nullable()
);

/** @public */
export const RequestOptionalEnvEmailSchema = RequestOptionalEnvSchema.pipe(
    RequestEmailSchema.nullable()
);

/** @public */
export const RequestOptionalEnvSesIdentityArnSchema =
    RequestOptionalEnvSchema.pipe(RequestSesIdentityArnSchema.nullable());

/** @public */
export const RequestOptionalEnvUrlNoTrailingSlashSchema =
    RequestOptionalEnvSchema.pipe(RequestUrlNoTrailingSlashSchema.nullable());

/** @public */
export const RequestOptionalEnvUrlSchema = RequestOptionalEnvSchema.pipe(
    z.url().nullable()
);

/** @public */
export const RequestOptionalEnvTrustedProxySchema =
    RequestOptionalEnvSchema.pipe(RequestTrustedProxySchema.nullable());
