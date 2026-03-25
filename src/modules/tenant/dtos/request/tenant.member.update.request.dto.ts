import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberRole, EnumTenantMemberStatus } from '@generated/prisma-client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export class TenantMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Membership role',
        enum: [EnumTenantMemberRole.admin, EnumTenantMemberRole.member],
    })
    @IsOptional()
    @IsIn([EnumTenantMemberRole.admin, EnumTenantMemberRole.member])
    role?: EnumTenantMemberRole;

    @ApiProperty({
        required: false,
        description: 'Tenant member status',
        enum: EnumTenantMemberStatus,
    })
    @IsOptional()
    @IsEnum(EnumTenantMemberStatus)
    status?: EnumTenantMemberStatus;
}
