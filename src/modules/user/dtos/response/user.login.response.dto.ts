import { ApiProperty } from '@nestjs/swagger';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';

export class UserLoginResponseDto {
    @ApiProperty({
        description: 'Indicates whether an additional 2FA verification step is required',
        example: false,
    })
    isTwoFactorRequired: boolean;

    @ApiProperty({
        required: false,
        type: UserTokenResponseDto,
    })
    tokens?: UserTokenResponseDto;

    @ApiProperty({
        required: false,
        description: 'Challenge token to be used for completing 2FA login',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    })
    challengeToken?: string;

    @ApiProperty({
        required: false,
        description: 'Challenge token TTL in seconds',
        example: 300,
    })
    challengeExpiresIn?: number;

    @ApiProperty({
        required: false,
        description: 'Remaining backup codes count for the account',
        example: 8,
    })
    backupCodesRemaining?: number;
}
