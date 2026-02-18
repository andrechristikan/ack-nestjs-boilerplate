import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantMemberStatus } from '@prisma/client';
import { TenantRoleResponseDto } from '@modules/tenant/dtos/response/tenant.role.response.dto';

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
        type: TenantRoleResponseDto,
    })
    role: TenantRoleResponseDto;

}
