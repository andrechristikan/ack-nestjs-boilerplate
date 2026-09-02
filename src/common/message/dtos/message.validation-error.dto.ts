import { ApiProperty } from '@nestjs/swagger';

/**
 * One failed constraint on one request field.
 */
export class MessageValidationErrorDto {
    @ApiProperty({
        type: String,
        required: true,
        description: 'Name of the class-validator constraint that failed',
        example: 'isNotEmpty',
    })
    key: string;

    @ApiProperty({
        type: String,
        required: true,
        description:
            'Dot-separated path of the request field that failed the constraint',
        example: 'email',
    })
    property: string;

    @ApiProperty({
        type: String,
        required: true,
        description: 'Localized explanation of the failure',
        example: 'email cannot be empty.',
    })
    message: string;
}
