import { EnumProjectMemberRole } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class ProjectMemberUpdateRoleRequestDto {
    @ApiProperty({
        description:
            'New project member role; setting or changing admin requires the caller to be workspace owner or admin',
        example: EnumProjectMemberRole.member,
        enum: EnumProjectMemberRole,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumProjectMemberRole)
    role: EnumProjectMemberRole;
}
