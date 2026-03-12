import { ApiProperty } from '@nestjs/swagger';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';

export class ProjectAccessResponseDto {
    @ApiProperty({
        required: true,
        description: 'Access type for the project',
        enum: ['member', 'shared'],
        example: 'member',
    })
    accessType: 'member' | 'shared';

    @ApiProperty({
        required: true,
        description: 'Project details',
        type: ProjectResponseDto,
    })
    project: ProjectResponseDto;
}
