import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { UserTwoFactorResponseDto } from '@modules/user/dtos/response/user.two-factor.response.dto';
import { Expose, Type } from 'class-transformer';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';

export class UserLoginResponseDto {
    @ApiProperty({
        description:
            'Indicates whether an additional 2FA verification step is enable',
        example: false,
        required: true,
    })
    @Expose()
    isTwoFactorEnable: boolean;

    @ApiProperty({
        description:
            'Id of the workspace the user last switched to; null when never set',
        example: faker.database.mongodbObjectId(),
        nullable: true,
        required: true,
    })
    @Expose()
    lastWorkspaceId: string | null;

    @ApiProperty({
        description: 'When lastWorkspaceId last changed; null when never set',
        example: faker.date.recent(),
        nullable: true,
        required: true,
    })
    @Expose()
    lastWorkspaceChangedAt: Date | null;

    @ApiProperty({
        required: false,
        type: AuthTokenResponseDto,
        description: 'Provides access and refresh tokens upon successful login',
    })
    @Expose()
    @Type(() => AuthTokenResponseDto)
    tokens?: AuthTokenResponseDto;

    @ApiProperty({
        required: false,
        type: UserTwoFactorResponseDto,
        description:
            'Provides details for completing the 2FA verification step',
    })
    @Expose()
    @Type(() => UserTwoFactorResponseDto)
    twoFactor?: UserTwoFactorResponseDto;
}
