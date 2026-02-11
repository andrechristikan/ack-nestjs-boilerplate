import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectMemberStatus } from '@prisma/client';

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
        description: 'Role name',
    })
    roleName: string;

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
}
