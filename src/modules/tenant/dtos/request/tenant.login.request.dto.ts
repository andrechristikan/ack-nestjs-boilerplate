import { EnumUserLoginFrom } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TenantLoginRequestDto {
    @IsEmail()
    @IsNotEmpty()
    email: Lowercase<string>;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsNotEmpty()
    @IsEnum(EnumUserLoginFrom)
    from: EnumUserLoginFrom;
}
