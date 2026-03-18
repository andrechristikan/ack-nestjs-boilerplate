import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectUpdateRequestDto {
    @ApiProperty({
        required: false,
        description: 'Project name',
        example: 'Q3 Expansion',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        description: 'Project description',
        example: 'Workspace for Q3 expansion initiatives',
        required: false,
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;
}
