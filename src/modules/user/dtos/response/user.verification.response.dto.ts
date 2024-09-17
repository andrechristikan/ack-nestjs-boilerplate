import { ApiProperty } from '@nestjs/swagger';

export class UserVerificationResponseDto {
    @ApiProperty({
        example: false,
        required: true,
        default: false,
    })
    email: boolean;
}
