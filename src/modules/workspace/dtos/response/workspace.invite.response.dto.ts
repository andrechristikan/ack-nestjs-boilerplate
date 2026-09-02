import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import {
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WorkspaceInviteResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the workspace the invite belongs to',
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
        description: 'Email address the invite is sent to',
    })
    @Expose()
    email: string;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
        description: 'Workspace role granted when the invite is accepted',
    })
    @Expose()
    workspaceRole: EnumWorkspaceMemberRole;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the project the invite also grants, if any',
    })
    @Expose()
    projectId: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: EnumProjectMemberRole.member,
        enum: EnumProjectMemberRole,
        description: 'Project role granted when the invite is accepted, if any',
    })
    @Expose()
    projectRole: EnumProjectMemberRole | null;

    @ApiProperty({
        required: true,
        example: 'WIN-abc123',
        description: 'Human-readable reference of the invite',
    })
    @Expose()
    reference: string;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
        description: 'When the invite expires',
    })
    @Expose()
    expiredAt: Date;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceInviteStatus.pending,
        enum: EnumWorkspaceInviteStatus,
        description: 'Current status of the invite',
    })
    @Expose()
    status: EnumWorkspaceInviteStatus;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who sent the invite',
    })
    @Expose()
    invitedByUserId: string;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.date.recent(),
        description: 'When the invite was accepted',
    })
    @Expose()
    acceptedAt: Date | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who accepted the invite',
    })
    @Expose()
    acceptedByUserId: string | null;
}
