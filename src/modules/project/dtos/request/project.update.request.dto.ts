import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectUpdateRequestDto {
    @ApiPropertyOptional({
        description: 'Project name',
        example: 'Q3 Expansion',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({
        description: 'Project description',
        example: 'Workspace for Q3 expansion initiatives',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;
}
