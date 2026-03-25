import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class ProjectMemberCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'User id to add as project member',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Role for project member',
        enum: EnumProjectMemberRole,
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumProjectMemberRole)
    role: EnumProjectMemberRole;
}
