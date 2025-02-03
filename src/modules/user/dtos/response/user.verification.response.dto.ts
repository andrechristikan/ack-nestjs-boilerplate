import { ApiProperty } from '@nestjs/swagger';

export class UserVerificationResponseDto {
    @ApiProperty({
        example: false,
        required: true,
        default: false,
    })
    email: boolean;

    @ApiProperty({
        required: false,
    })
    emailVerifiedDate?: Date;

    @ApiProperty({
        example: false,
        required: true,
        default: false,
    })
    mobileNumber: boolean;

    @ApiProperty({
        required: false,
    })
    mobileNumberVerifiedDate?: Date;
}
