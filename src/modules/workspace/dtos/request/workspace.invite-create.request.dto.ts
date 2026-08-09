import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { faker } from '@faker-js/faker';
import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class WorkspaceInviteCreateRequestDto {
    @ApiProperty({
        description: 'Email of the person being invited',
        example: faker.internet.email(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsCustomEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        description: 'Workspace role granted once the invite is accepted; owner can never be invited',
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumWorkspaceMemberRole)
    @IsIn([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])
    workspaceRole: EnumWorkspaceMemberRole;

    @ApiProperty({
        description: 'Project to also join; must belong to the current workspace. Requires projectRole',
        example: faker.database.mongodbObjectId(),
        required: false,
    })
    @IsString()
    @IsOptional()
    @IsMongoId()
    projectId?: string;

    @ApiProperty({
        description: 'Project role granted on accept; required when projectId is set, otherwise omitted',
        example: EnumProjectMemberRole.member,
        enum: EnumProjectMemberRole,
        required: false,
    })
    @IsOptional()
    @IsEnum(EnumProjectMemberRole)
    projectRole?: EnumProjectMemberRole;

    @ApiProperty({
        description:
            'Invite expiry duration in days; omitted falls back to the configured default (currently 7 days)',
        example: EnumWorkspaceInviteExpiry.sevenDays,
        enum: EnumWorkspaceInviteExpiry,
        required: false,
    })
    @IsOptional()
    @IsEnum(EnumWorkspaceInviteExpiry)
    expiryDuration?: EnumWorkspaceInviteExpiry;
}
