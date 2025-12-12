import {
    IMessageValidationError,
    IMessageValidationImportError,
} from '@common/message/interfaces/message.interface';
import { ResponseDto } from '@common/response/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for error responses with validation error details.
 * Extends standard response structure to include specific validation error information.
 */
export class ResponseErrorDto extends ResponseDto<unknown> {
    @ApiProperty({
        type: 'array',
        description: 'List of validation errors',
        required: false,
    })
    errors?: IMessageValidationError[] | IMessageValidationImportError[];
}
