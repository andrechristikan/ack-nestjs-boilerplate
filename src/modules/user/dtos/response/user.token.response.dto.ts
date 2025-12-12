import { ApiProperty } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

export class UserTokenResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
    })
    tokenType: string;

    @ApiProperty({
        example: EnumRoleType.user,
        enum: EnumRoleType,
        required: true,
    })
    roleType: EnumRoleType;

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
