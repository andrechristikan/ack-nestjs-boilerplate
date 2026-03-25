import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectInviteStatus } from '@generated/prisma-client';

export class ProjectInviteStatusResponseDto {
    @ApiProperty({
        required: true,
        enum: EnumProjectInviteStatus,
    })
    status: EnumProjectInviteStatus;

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
