import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';

export class ProjectCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Project name',
        example: 'Q3 Expansion',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        required: false,
        type: () => ProjectMemberCreateRequestDto,
        isArray: true,
        description: 'Optional members to add when creating the project',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProjectMemberCreateRequestDto)
    members?: ProjectMemberCreateRequestDto[];
}
