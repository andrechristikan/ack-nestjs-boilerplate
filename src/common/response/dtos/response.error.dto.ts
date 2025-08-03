import {
    IMessageValidationError,
    IMessageValidationImportError,
} from '@common/message/interfaces/message.interface';
import { ResponseDto } from '@common/response/dtos/response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseErrorDto extends ResponseDto<unknown> {
    @ApiProperty({
        type: 'array',
        description: 'List of validation errors',
        required: false,
    })
    errors?: IMessageValidationError[] | IMessageValidationImportError[];
}
