import { ApiProperty } from '@nestjs/swagger';
import { EnumTenantStatus } from '@prisma/client';

export class TenantResponseDto {
    @ApiProperty({
        required: true,
        description: 'Tenant id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Tenant name',
    })
    name: string;

    @ApiProperty({
        required: true,
        description: 'Tenant status',
        enum: EnumTenantStatus,
    })
    status: EnumTenantStatus;

    @ApiProperty({
        required: true,
        description: 'Date created',
    })
    createdAt: Date;

    @ApiProperty({
        required: true,
        description: 'Date updated',
    })
    updatedAt: Date;
}
