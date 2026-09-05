import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectCreateRequestDto {
    @ApiProperty({
        description: 'Project name',
        example: 'Website Revamp',
        required: true,
        maxLength: 150,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

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
