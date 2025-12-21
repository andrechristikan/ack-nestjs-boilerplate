import { ApiProperty } from '@nestjs/swagger';

export class UserTwoFactorResponseDto {
    @ApiProperty({
        description:
            'Indicates whether the user is required to set up 2FA upon next login',
        example: false,
        required: true,
    })
    isRequiredSetup: boolean;

    @ApiProperty({
        required: true,
        description: 'Challenge token to be used for completing 2FA login',
        example: '2b5b8933f0a44a94b3e1a96f8d2e2f21',
    })
    challengeToken: string;

    @ApiProperty({
        required: true,
        description: 'Challenge token TTL in milliseconds',
        example: 300,
    })
    challengeExpiresInMs: number;

    @ApiProperty({
        required: true,
        description: 'Remaining backup codes count for the account',
        example: 8,
    })
    backupCodesRemaining: number;
}
