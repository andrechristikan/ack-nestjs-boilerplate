import { ApiProperty } from '@nestjs/swagger';
import { UserTwoFactorResponseDto } from '@modules/user/dtos/response/user.two-factor.response.dto';
import { Type } from 'class-transformer';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';

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
}
