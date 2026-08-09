import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkspaceUpdateRequestDto {
    @ApiProperty({
        description: 'Workspace name',
        example: 'Acme',
        required: false,
        maxLength: 150,
    })
    @IsString()
    @IsOptional()
    @MaxLength(150)
    name?: string;

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
}
