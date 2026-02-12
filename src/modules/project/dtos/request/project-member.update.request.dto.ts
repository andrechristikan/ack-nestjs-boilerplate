import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectMemberStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProjectMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Role name',
        example: 'project-editor',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    roleName?: string;

    @ApiProperty({
        required: false,
        description: 'Project member status',
        enum: EnumProjectMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumProjectMemberStatus)
    status?: EnumProjectMemberStatus;
}
