import { z } from 'zod';

/** @public */
export const RequestRequiredStringSchema = z.string().min(1).meta({
    description: 'Required non-empty string',
    example: 'value',
});
