import { Transform } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsOptional,
    ValidateIf
} from 'class-validator';
import { IsPasswordStrong, IsStartWith } from 'src/helper/helper.decorator';

export class UserSignUpValidation {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly firstName: string;

    @IsString()
    @IsOptional()
    @ValidateIf((val) => val !== '')
    @MinLength(1)
    @MaxLength(30)
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly lastName?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(13)
    @IsStartWith(['628'])
    readonly mobileNumber: string;

    @IsNotEmpty()
    @IsPasswordStrong()
    readonly password: string;
}
