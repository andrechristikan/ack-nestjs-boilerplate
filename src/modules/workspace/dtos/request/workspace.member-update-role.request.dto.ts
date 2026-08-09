import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty } from 'class-validator';

export class WorkspaceMemberUpdateRoleRequestDto {
    @ApiProperty({
        description:
            'New workspace member role; owner is never assignable through this endpoint (use ownership/transfer)',
        example: EnumWorkspaceMemberRole.admin,
        enum: EnumWorkspaceMemberRole,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumWorkspaceMemberRole)
    @IsIn([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])
    role: EnumWorkspaceMemberRole;
}
