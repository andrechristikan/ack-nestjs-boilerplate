import { ApiProperty } from '@nestjs/swagger';

export class UserTwoFactorStatusResponseDto {
    @ApiProperty({
        description:
            'Whether two-factor authentication is enabled for the account',
        example: false,
    })
    isTwoFactorEnabled: boolean;

    @ApiProperty({
        description:
            'True when 2FA setup has been started but not yet confirmed',
        example: false,
    })
    isTwoFactorPendingConfirmation: boolean;

    @ApiProperty({
        description: 'Remaining backup codes count for the account',
        example: 8,
        minimum: 0,
    })
    backupCodesRemaining: number;

    @ApiProperty({
        required: false,
        description: 'When two-factor authentication was confirmed/enabled',
        example: '2025-01-01T00:00:00.000Z',
    })
    confirmedAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Last time two-factor authentication was used/verified',
        example: '2025-01-01T00:00:00.000Z',
    })
    lastUsedAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Last time two-factor authentication verification succeeded',
        example: '2025-01-01T00:00:00.000Z',
    })
    lastVerifiedAt?: Date;
}

