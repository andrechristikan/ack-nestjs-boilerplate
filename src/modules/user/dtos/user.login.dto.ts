import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsEmail,
    MaxLength,
    IsBoolean,
    IsOptional,
    ValidateIf,
    IsString,
} from 'class-validator';

export class UserLoginDto {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @ApiProperty({
        description: 'Your email for login',
        maximum: 100,
        required: true,
        example: 'xxxx@mail.com',
    })
    readonly email: string;

    @IsOptional()
    @IsBoolean()
    @ValidateIf((e) => e.rememberMe !== '')
    @ApiProperty({
        description:
            'Remember me, this will trigger how log refresh token will be expire',
        default: false,
        required: false,
        example: false,
        nullable: true,
    })
    readonly rememberMe?: boolean;

    @IsNotEmpty()
    @Type(() => String)
    @IsString()
    @ApiProperty({
        description: 'Your password for login',
        required: true,
    })
    readonly password: string;
}
