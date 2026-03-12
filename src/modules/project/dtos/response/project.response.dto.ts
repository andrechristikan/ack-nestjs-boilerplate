import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectStatus } from '@generated/prisma-client';

export class ProjectResponseDto {
    @ApiProperty({
        required: true,
        description: 'Project id',
    })
    id: string;

    @ApiProperty({
        required: false,
        description: 'Tenant id',
        nullable: true,
    })
    tenantId?: string;

    @ApiProperty({
        required: true,
        description: 'Project name',
    })
    name: string;

    @ApiProperty({
        required: true,
        description: 'Project status',
        enum: EnumProjectStatus,
    })
    status: EnumProjectStatus;

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
