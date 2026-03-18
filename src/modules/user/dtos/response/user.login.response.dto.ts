import { ApiProperty } from '@nestjs/swagger';
import { UserTwoFactorResponseDto } from '@modules/user/dtos/response/user.two-factor.response.dto';
import { Type } from 'class-transformer';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { faker } from '@faker-js/faker';

export class UserLoginTenantResponseDto {
    @ApiProperty({
        description: 'Last active tenant ID for the user',
        example: faker.database.mongodbObjectId(),
        required: false,
        nullable: true,
    })
    id?: string | null;
}

export class UserLoginResponseDto {
    @ApiProperty({
        description:
            'Indicates whether an additional 2FA verification step is enable',
        example: false,
        required: true,
    })
    isTwoFactorEnable: boolean;

    @ApiProperty({
        required: false,
        type: AuthTokenResponseDto,
        description: 'Provides access and refresh tokens upon successful login',
    })
    @Type(() => AuthTokenResponseDto)
    tokens?: AuthTokenResponseDto;

    @ApiProperty({
        required: false,
        type: UserTwoFactorResponseDto,
        description:
            'Provides details for completing the 2FA verification step',
    })
    @Type(() => UserTwoFactorResponseDto)
    twoFactor?: UserTwoFactorResponseDto;

    @ApiProperty({
        required: false,
        type: UserLoginTenantResponseDto,
        description: 'Last active tenant for the user',
    })
    @Type(() => UserLoginTenantResponseDto)
    tenant?: UserLoginTenantResponseDto;
}
