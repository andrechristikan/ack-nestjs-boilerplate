import { PartialType } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

export class AuthApiCreateDto {
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

export class AuthApiCreateRawDto extends PartialType(AuthApiCreateDto) {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(16)
    @MaxLength(20)
    passphrase: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    encryptionKey: string;
}
