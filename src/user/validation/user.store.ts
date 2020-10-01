import {
    IsString,
    IsLowercase,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength
} from 'class-validator';

export class UserStoreRequest {
    @IsString()
    @IsNotEmpty()
    country: string;

    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    @IsEmail()
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
