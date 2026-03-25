import { ApiProperty } from '@nestjs/swagger';
import {
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
} from '@generated/prisma-client';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class ProjectMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Role',
        enum: EnumProjectMemberRole,
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @IsEnum(EnumProjectMemberRole)
    role?: EnumProjectMemberRole;

    @ApiProperty({
        required: false,
        description: 'Project member status',
        enum: EnumProjectMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumProjectMemberStatus)
    status?: EnumProjectMemberStatus;
}
