import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

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

    @ApiProperty({
        description:
            'Project slug; omit to auto-generate. Charset [0-9a-zA-Z-], length capped by the project slug configuration (30 characters), unique per workspace',
        example: 'website-revamp',
        required: false,
    })
    @IsString()
    @IsOptional()
    slug?: string;
}
