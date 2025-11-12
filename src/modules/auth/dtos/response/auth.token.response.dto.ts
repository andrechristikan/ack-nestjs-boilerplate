import { ApiProperty } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from '@prisma/client';

/**
 * Response DTO for authentication token containing token information and user role
 */
export class AuthTokenResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
    })
    tokenType: string;

    @ApiProperty({
        example: ENUM_ROLE_TYPE.user,
        enum: ENUM_ROLE_TYPE,
        type: String,
        required: true,
    })
    roleType: ENUM_ROLE_TYPE;

    @ApiProperty({
        example: 3600,
        description: 'timestamp in minutes',
        required: true,
    })
    expiresIn: number;

    @ApiProperty({
        required: true,
    })
    accessToken: string;

    @ApiProperty({
        required: true,
    })
    refreshToken: string;
}
