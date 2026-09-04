import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { EnumRoleType } from '@generated/prisma-client';
import { IAuthToken } from '@modules/auth/interfaces/auth.interface';

export class AuthTokenResponseDto implements IAuthToken {
    @ApiProperty({
        example: 'Bearer',
        required: true,
        description: 'Token type prefix sent with the access token',
    })
    tokenType: string;

    @ApiProperty({
        example: EnumRoleType.user,
        enum: EnumRoleType,
        type: String,
        required: true,
        description: 'Role type encoded in the issued tokens',
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
        example: faker.string.alphanumeric(64),
        description: 'JWT access token',
    })
    accessToken: string;

    @ApiProperty({
        required: true,
        example: faker.string.alphanumeric(64),
        description: 'JWT refresh token',
    })
    refreshToken: string;
}
