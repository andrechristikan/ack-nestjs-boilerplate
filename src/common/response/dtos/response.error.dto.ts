import {
    IMessageValidationError,
    IMessageValidationImportError,
} from '@common/message/interfaces/message.interface';
import { ResponseDto } from '@common/response/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Error response envelope adding an optional list of validation errors.
 */
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
        type: 'array',
        description: 'List of validation errors',
        required: false,
    })
    errors?: IMessageValidationError[] | IMessageValidationImportError[];
}
