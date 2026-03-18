import { ApiProperty } from '@nestjs/swagger';
import {
    EnumTenantInviteStatus,
    EnumTenantInviteType,
    EnumTenantMemberRole,
} from '@generated/prisma-client';

export class TenantInviteResponseDto {
    @ApiProperty({ required: true })
    id: string;

    @ApiProperty({ required: true })
    tenantId: string;

    @ApiProperty({ required: true })
    invitedEmail: string;

    @ApiProperty({ required: true, enum: EnumTenantMemberRole })
    tenantRole: EnumTenantMemberRole;

    @ApiProperty({ required: true, enum: EnumTenantInviteType })
    type: EnumTenantInviteType;

    @ApiProperty({ required: true, enum: EnumTenantInviteStatus })
    status: EnumTenantInviteStatus;

    @ApiProperty({ required: true })
    expiresAt: Date;

    @ApiProperty({ required: false })
    acceptedAt?: Date;

    @ApiProperty({ required: false })
    revokedAt?: Date;

    @ApiProperty({ required: true })
    createdAt: Date;

    @ApiProperty({
        description:
            'Remaining seconds until expiry (only for pending invites)',
        required: false,
    })
    remainingSeconds?: number;
}
