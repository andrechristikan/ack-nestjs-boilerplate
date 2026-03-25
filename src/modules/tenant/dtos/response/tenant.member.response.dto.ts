import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberRole, EnumTenantMemberStatus } from '@generated/prisma-client';

export class TenantMemberResponseDto {
    @ApiProperty({
        required: true,
        description: 'Tenant member id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Tenant id',
    })
    tenantId: string;

    @ApiProperty({
        required: true,
        description: 'User id',
    })
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Tenant member status',
        enum: EnumTenantMemberStatus,
    })
    status: EnumTenantMemberStatus;

    @ApiProperty({
        required: true,
        description: 'Membership role',
        enum: EnumTenantMemberRole,
    })
    role: EnumTenantMemberRole;
}
