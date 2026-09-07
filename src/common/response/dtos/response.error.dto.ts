import { z } from 'zod';
import { MessageValidationErrorSchema } from '@common/message/dtos/message.validation-error.dto';
import { MessageValidationImportErrorSchema } from '@common/message/dtos/message.validation-import-error.dto';
import { ResponseSchema } from '@common/response/dtos/response.dto';

/**
 * Error response envelope adding an optional list of validation errors.
 */
export const ResponseErrorSchema = ResponseSchema.extend({
    data: z.unknown().optional(),
    module: z.string().optional().meta({
        description: 'Owning module of the error',
        example: 'user',
    }),
    statusCodeKey: z.string().optional().meta({
        description: 'Status-code enum key of the error',
        example: 'notFound',
    }),
    errors: z
        .union([
            z.array(MessageValidationErrorSchema),
            z.array(MessageValidationImportErrorSchema),
        ])
        .optional()
        .meta({
            description:
                'Field errors of a request body, or row errors of an imported file',
        }),
});

export type ResponseErrorDto = z.infer<typeof ResponseErrorSchema>;
