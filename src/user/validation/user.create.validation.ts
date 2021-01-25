import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength
} from 'class-validator';

export class UserCreateValidation {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    readonly lastName: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(13)
    readonly mobileNumber: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(30)
    readonly password: string;
}
