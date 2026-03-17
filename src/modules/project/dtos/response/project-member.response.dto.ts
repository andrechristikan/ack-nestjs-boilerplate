import { ApiProperty } from '@nestjs/swagger';
import {
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
} from '@generated/prisma-client';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';

export class ProjectMemberResponseDto {
    @ApiProperty({
        required: true,
        description: 'Project member id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Project id',
    })
    projectId: string;

    @ApiProperty({
        required: true,
        description: 'User id',
    })
    userId: string;

    @ApiProperty({
        required: true,
        description: 'User email',
    })
    email: string;

    @ApiProperty({
        required: true,
        description: 'Role',
        enum: EnumProjectMemberRole,
    })
    role: EnumProjectMemberRole;

    @ApiProperty({
        required: true,
        description: 'Project member status',
        enum: EnumProjectMemberStatus,
    })
    status: EnumProjectMemberStatus;

    @ApiProperty({
        required: true,
        description: 'Date created',
    })
    createdAt: Date;

    @ApiProperty({
        required: true,
        type: InviteStatusResponseDto,
    })
    invite: InviteStatusResponseDto;
}
