import {
    IsString,
    IsLowercase,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsMobilePhone
} from 'class-validator';

export class UserCreateValidation {
    @IsEmail()
    @IsNotEmpty()
    @IsLowercase()
    email: string;

    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(13)
    @MinLength(10)
    mobileNumber: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
