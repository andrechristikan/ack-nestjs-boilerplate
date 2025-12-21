import { ApiProperty } from '@nestjs/swagger';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { UserTwoFactorResponseDto } from '@modules/user/dtos/response/user.two-factor.response.dto';
import { Type } from 'class-transformer';

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
        type: UserTokenResponseDto,
        description: 'Provides access and refresh tokens upon successful login',
    })
    @Type(() => UserTokenResponseDto)
    tokens?: UserTokenResponseDto;

    @ApiProperty({
        required: false,
        type: UserTwoFactorResponseDto,
        description:
            'Provides details for completing the 2FA verification step',
    })
    @Type(() => UserTwoFactorResponseDto)
    twoFactor?: UserTwoFactorResponseDto;
}
