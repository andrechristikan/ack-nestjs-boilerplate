import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantInviteStatus } from '@generated/prisma-client';

export class TenantInviteStatusResponseDto {
    @ApiProperty({
        required: true,
        enum: EnumTenantInviteStatus,
    })
    status: EnumTenantInviteStatus;

    @ApiProperty({
        required: false,
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
        description:
            'Seconds remaining before expiration when status is pending',
    })
    remainingSeconds?: number;

    @ApiProperty({
        required: false,
    })
    sentAt?: Date;

    @ApiProperty({
        required: false,
    })
    acceptedAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Timestamp when the invitation was revoked',
    })
    revokedAt?: Date;
}
