import { z } from 'zod';

/**
 * One failed validation issue on one request field.
 */
export const MessageValidationErrorSchema = z.object({
    key: z.string().meta({
        description: 'Zod issue code of the failure',
        example: 'tooSmall',
    }),
    property: z.string().meta({
        description:
            'Dot-separated path of the request field that failed validation',
        example: 'email',
    }),
    message: z.string().meta({
        description: 'Localized explanation of the failure',
        example: 'email is shorter than the minimum length allowed.',
    }),
});

export type MessageValidationErrorDto = z.infer<
    typeof MessageValidationErrorSchema
>;
