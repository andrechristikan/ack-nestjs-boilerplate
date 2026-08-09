import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectUpdateRequestDto {
    @ApiProperty({
        description: 'Project name',
        example: 'Website Revamp',
        required: false,
        maxLength: 150,
    })
    @IsString()
    @IsOptional()
    @MaxLength(150)
    name?: string;

    @ApiProperty({
        description: 'Project description',
        example: 'Marketing site redesign',
        required: false,
        maxLength: 500,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;
}
