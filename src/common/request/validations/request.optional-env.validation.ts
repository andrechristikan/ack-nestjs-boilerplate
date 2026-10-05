import { z } from 'zod';

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
        value => (value === '' ? undefined : value),
        schema.optional()
    );
