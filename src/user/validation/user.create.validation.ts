import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsBoolean,
    IsMongoId,
    IsOptional
} from 'class-validator';
import { Types } from 'mongoose';

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

    @IsBoolean()
    @IsNotEmpty()
    readonly isAdmin: boolean;

    @IsMongoId()
    @IsOptional()
    readonly roleId: Types.ObjectId;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(30)
    readonly password: string;
}
