
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsUUID,
    IsOptional,
    ValidateIf,
    IsEnum,
} from 'class-validator';
import { IsPasswordStrong } from 'src/common/request/validations/request.is-password-strong.validation';
import { MobileNumberAllowed } from 'src/common/request/validations/request.mobile-number-allowed.validation';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import {Field, InputType} from "@nestjs/graphql";

@InputType()
export class UserCreateDto {

    @Field()
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly email: string;


    @Field()
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    readonly firstName: string;


    @Field()
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    readonly lastName: string;

    @Field()
    @IsString()
    @IsOptional()
    @MinLength(10)
    @MaxLength(14)
    @ValidateIf((e) => e.mobileNumber !== '')
    @Type(() => String)
    @MobileNumberAllowed()
    readonly mobileNumber?: string;

    @Field()
    @IsNotEmpty()
    @IsUUID('4')
    readonly role: string;

    @Field()
    @IsNotEmpty()
    @IsPasswordStrong()
    @MaxLength(50)
    readonly password: string;

    @Field()
    @IsEnum(ENUM_USER_SIGN_UP_FROM)
    @IsString()
    @IsNotEmpty()
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;
}
