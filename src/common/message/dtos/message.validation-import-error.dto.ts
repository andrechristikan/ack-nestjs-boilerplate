import { z } from 'zod';
import { MessageValidationErrorSchema } from '@common/message/dtos/message.validation-error.dto';

/** @public */
export const MessageValidationImportErrorSchema = z.object({
    row: z.number().meta({
        description: 'Row of the imported file the errors belong to',
        example: 3,
    }),
    errors: z.array(MessageValidationErrorSchema).meta({
        description: 'Failed validation issues found on that row',
        example: [
            {
                key: 'tooSmall',
                property: 'email',
                message: 'email is shorter than the minimum length allowed.',
            },
        ],
    }),
});

/** @public */
export type MessageValidationImportErrorDto = z.infer<
    typeof MessageValidationImportErrorSchema
>;
