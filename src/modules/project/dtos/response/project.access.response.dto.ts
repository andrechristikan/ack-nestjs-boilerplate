import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectAccessType } from '@modules/project/enums/project.access-type.enum';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';

export class ProjectAccessResponseDto {
    @ApiProperty({
        required: true,
        description: 'Access type for the project',
        enum: EnumProjectAccessType,
    })
    accessType: EnumProjectAccessType;

    @ApiProperty({
        required: true,
        description: 'Project details',
        type: ProjectResponseDto,
    })
    project: ProjectResponseDto;
}
