import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserTwoFactorStatusResponseDto {
    @ApiProperty({
        required: true,
        description:
            'Whether two-factor authentication is enabled for the account',
        example: false,
    })
    @Expose()
    isEnabled: boolean;

    @ApiProperty({
        required: true,
        description:
            'True when 2FA setup has been started but not yet confirmed',
        example: false,
    })
    @Expose()
    isPendingConfirmation: boolean;

    @ApiProperty({
        required: true,
        description: 'Remaining backup codes count for the account',
        example: 8,
        minimum: 0,
    })
    @Expose()
    backupCodesRemaining: number;

    @ApiProperty({
        required: false,
        description: 'When two-factor authentication was confirmed/enabled',
        example: '2025-01-01T00:00:00.000Z',
    })
    @Expose()
    confirmedAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Last time two-factor authentication was used/verified',
        example: '2025-01-01T00:00:00.000Z',
    })
    @Expose()
    lastUsedAt?: Date;
}
