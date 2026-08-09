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
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    @Expose()
    email: string;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
    })
    @Expose()
    workspaceRole: EnumWorkspaceMemberRole;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    projectId: string | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: EnumProjectMemberRole.member,
        enum: EnumProjectMemberRole,
    })
    @Expose()
    projectRole: EnumProjectMemberRole | null;

    @ApiProperty({
        required: true,
        example: 'WIN-abc123',
    })
    @Expose()
    reference: string;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    @Expose()
    expiredAt: Date;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceInviteStatus.pending,
        enum: EnumWorkspaceInviteStatus,
    })
    @Expose()
    status: EnumWorkspaceInviteStatus;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    invitedByUserId: string;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.date.recent(),
    })
    @Expose()
    acceptedAt: Date | null;

    @ApiProperty({
        required: false,
        nullable: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    acceptedByUserId: string | null;
}
