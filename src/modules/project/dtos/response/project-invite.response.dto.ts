import { ApiProperty } from '@nestjs/swagger';
import {
    EnumProjectInviteStatus,
    EnumProjectMemberRole,
} from '@generated/prisma-client';

export class ProjectInviteResponseDto {
    @ApiProperty({ required: true })
    id: string;

    @ApiProperty({ required: true })
    inviteeById: string;

    @ApiProperty({ required: true })
    inviteeEmail: string;

    @ApiProperty({ required: true })
    projectId: string;

    @ApiProperty({ required: true, enum: EnumProjectMemberRole })
    projectRole: EnumProjectMemberRole;

    @ApiProperty({ required: true, enum: EnumProjectInviteStatus })
    status: EnumProjectInviteStatus;

    @ApiProperty({ required: true })
    expiresAt: Date;

    @ApiProperty({ required: false })
    acceptedAt?: Date;

    @ApiProperty({ required: false })
    revokedAt?: Date;

    @ApiProperty({ required: false })
    revokedById?: string;

    @ApiProperty({ required: true })
    createdAt: Date;

    @ApiProperty({ required: false })
    remainingSeconds?: number;
}
