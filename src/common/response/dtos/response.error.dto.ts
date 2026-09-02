import { MessageValidationErrorDto } from '@common/message/dtos/message.validation-error.dto';
import { MessageValidationImportErrorDto } from '@common/message/dtos/message.validation-import-error.dto';
import {
    IMessageValidationError,
    IMessageValidationImportError,
} from '@common/message/interfaces/message.interface';
import { ResponseDto } from '@common/response/dtos/response.dto';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';

/**
 * Error response envelope adding an optional list of validation errors.
 */
@ApiExtraModels(MessageValidationErrorDto, MessageValidationImportErrorDto)
export class ResponseErrorDto extends ResponseDto<unknown> {
    @ApiProperty({
        type: String,
        description: 'Owning module of the error',
        required: false,
        example: 'user',
    })
    module?: string;

    @ApiProperty({
        type: String,
        description: 'Status-code enum key of the error',
        required: false,
        example: 'notFound',
    })
    statusCodeKey?: string;

    @ApiProperty({
        description:
            'Field errors of a request body, or row errors of an imported file',
        required: false,
        oneOf: [
            {
                type: 'array',
                items: { $ref: getSchemaPath(MessageValidationErrorDto) },
            },
            {
                type: 'array',
                items: { $ref: getSchemaPath(MessageValidationImportErrorDto) },
            },
        ],
    })
    errors?: IMessageValidationError[] | IMessageValidationImportError[];
}
