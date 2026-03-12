import { ApiProperty } from '@nestjs/swagger';

export class TenantJitAccessResponseDto {
    @ApiProperty({
        required: true,
        description: 'Tenant member id',
    })
    memberId: string;

    @ApiProperty({
        required: true,
        description: 'Tenant id',
    })
    tenantId: string;

    @ApiProperty({
        required: true,
        description: 'Tenant name',
    })
    tenantName: string;

    @ApiProperty({
        required: true,
        description: 'Assigned role name',
    })
    role: string;

    @ApiProperty({
        required: true,
        description: 'When JIT access expires',
    })
    expiresAt: Date;

    @ApiProperty({
        required: true,
        description: 'Reason for JIT access',
    })
    reason: string;
}
