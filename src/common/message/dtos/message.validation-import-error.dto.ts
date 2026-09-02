import { MessageValidationErrorDto } from '@common/message/dtos/message.validation-error.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Failed constraints grouped by the imported row they came from.
 */
export class MessageValidationImportErrorDto {
    @ApiProperty({
        type: Number,
        required: true,
        description: 'Row of the imported file the errors belong to',
        example: 3,
    })
    row: number;

    @ApiProperty({
        type: [MessageValidationErrorDto],
        required: true,
        description: 'Failed constraints found on that row',
        example: [
            {
                key: 'isNotEmpty',
                property: 'email',
                message: 'email cannot be empty.',
            },
        ],
    })
    errors: MessageValidationErrorDto[];
}
