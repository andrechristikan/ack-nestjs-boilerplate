import { z } from 'zod';

/**
 * Required non-empty string.
 * @public
 */
export const RequestRequiredStringSchema = z.string().min(1).meta({
    description: 'Required non-empty string',
    example: 'value',
});
