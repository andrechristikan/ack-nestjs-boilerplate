import { ApiProperty } from '@nestjs/swagger';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    Max,
    MaxLength,
} from 'class-validator';
import { EnumProjectMemberRole } from '@generated/prisma-client';

export class ProjectInviteCreateRequestDto {
    private static readonly AllowedRoles = [
        EnumProjectMemberRole.admin,
        EnumProjectMemberRole.member,
        EnumProjectMemberRole.viewer,
    ] as const;

    @ApiProperty({
        required: true,
        description: 'Email address to invite',
    })
    @IsNotEmpty()
    @MaxLength(100)
    @IsCustomEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        description: 'Project role for the invited member',
        enum: ProjectInviteCreateRequestDto.AllowedRoles,
    })
    @IsEnum(EnumProjectMemberRole)
    @IsIn(ProjectInviteCreateRequestDto.AllowedRoles)
    @IsNotEmpty()
    role: (typeof ProjectInviteCreateRequestDto.AllowedRoles)[number];

    @ApiProperty({
        description:
            'Number of days until the invitation expires (default: 7, max: 30)',
        default: 7,
        maximum: 30,
        minimum: 1,
    })
    @IsOptional()
    @IsPositive()
    @Max(30)
    expiresInDays?: number;
}
