import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnumProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

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
        description: 'Project status',
        enum: EnumProjectStatus,
    })
    @IsEnum(EnumProjectStatus)
    @IsOptional()
    status?: EnumProjectStatus;
}
