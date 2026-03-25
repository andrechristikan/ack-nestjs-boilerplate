import { ApiProperty } from '@nestjs/swagger';

export class ProjectResponseDto {
    @ApiProperty({
        required: true,
        description: 'Project id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Tenant id',
    })
    tenantId: string;

    @ApiProperty({
        required: true,
        description: 'Project name',
    })
    name: string;

    @ApiProperty({
        required: true,
        description: 'Project description',
    })
    description: string;

    @ApiProperty({
        required: true,
        description: 'Project slug',
    })
    slug: string;

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
