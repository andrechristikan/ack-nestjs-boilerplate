import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsMongoId,
    IsOptional,
    ValidateIf
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
    @IsOptional()
    @ValidateIf((val) => val !== '')
    @MinLength(3)
    @MaxLength(30)
    readonly lastName?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(13)
    readonly mobileNumber: string;

    @IsNotEmpty()
    @IsMongoId()
    readonly role: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(30)
    readonly password: string;
}
