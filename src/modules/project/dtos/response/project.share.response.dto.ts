import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectShareAccess } from '@prisma/client';

export class ProjectShareResponseDto {
    @ApiProperty({
        required: true,
        description: 'Share id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Project id',
    })
    projectId: string;

    @ApiProperty({
        required: true,
        description: 'User id',
    })
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Share access',
        enum: EnumProjectShareAccess,
    })
    access: EnumProjectShareAccess;

    @ApiProperty({
        required: true,
        description: 'Date created',
    })
    createdAt: Date;
}
