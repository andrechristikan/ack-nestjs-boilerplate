import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberRole, EnumTenantMemberStatus } from '@generated/prisma-client';
import { IsEnum, IsOptional } from 'class-validator';

export class TenantMemberUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Membership role',
        enum: EnumTenantMemberRole,
    })
    @IsOptional()
    @IsEnum(EnumTenantMemberRole)
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
