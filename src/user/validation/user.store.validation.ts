import {
    IsString,
    IsLowercase,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsMobilePhone
} from 'class-validator';

export class UserStoreValidation {
    @IsString()
    @IsNotEmpty()
    country: string;

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

    @IsMobilePhone('id-ID')
    @IsNotEmpty()
    @MaxLength(13)
    @MinLength(10)
    mobileNumber: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
