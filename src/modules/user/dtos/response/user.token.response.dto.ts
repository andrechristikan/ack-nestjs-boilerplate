import { ApiProperty } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from '@prisma/client';

export class UserTokenResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
    })
    tokenType: string;

    @ApiProperty({
        example: ENUM_ROLE_TYPE.user,
        enum: ENUM_ROLE_TYPE,
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
