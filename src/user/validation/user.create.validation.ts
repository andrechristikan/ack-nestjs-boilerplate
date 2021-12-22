import { Transform, Type } from 'class-transformer';
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
import { IsPasswordStrong, IsStartWith } from 'src/helper/helper.decorator';

export class UserCreateValidation {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly firstName: string;

    @IsString()
    @IsOptional()
    @ValidateIf((e) => e.lastName !== '')
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly lastName?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(13)
    @Type(() => String)
    @IsStartWith(['628'])
    readonly mobileNumber: string;

    @IsNotEmpty()
    @IsMongoId()
    readonly role: string;

    @IsNotEmpty()
    @IsPasswordStrong()
    readonly password: string;
}
