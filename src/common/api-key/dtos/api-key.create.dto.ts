import { PartialType } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateIf,
} from 'class-validator';

export class ApiKeyCreateDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @IsOptional()
    @ValidateIf((e) => e.description !== '')
    @IsString()
    @MaxLength(100)
    description?: string;
}

export class ApiKeyCreateRawDto extends PartialType(ApiKeyCreateDto) {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}
