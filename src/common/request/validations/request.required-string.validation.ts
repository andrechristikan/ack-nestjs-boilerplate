import { z } from 'zod';

export const RequestRequiredStringSchema = z.string().min(1).meta({
    description: 'Required non-empty string',
    example: 'value',
});
