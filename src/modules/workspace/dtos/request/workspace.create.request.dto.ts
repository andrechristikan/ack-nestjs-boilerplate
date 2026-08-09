import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class WorkspaceCreateRequestDto {
    @ApiProperty({
        description: 'Workspace name',
        example: 'Acme',
        required: true,
        maxLength: 150,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

    @ApiProperty({
        description: 'Workspace description',
        example: 'Our team workspace',
        required: false,
        maxLength: 500,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description:
            'Whether the workspace is publicly discoverable for join requests',
        example: false,
        required: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @ApiProperty({
        description:
            'Workspace slug; omit to auto-generate. Charset [0-9a-zA-Z-], length capped by the workspace slug configuration (30 characters)',
        example: 'acme-team',
        required: false,
    })
    @IsString()
    @IsOptional()
    slug?: string;
}
