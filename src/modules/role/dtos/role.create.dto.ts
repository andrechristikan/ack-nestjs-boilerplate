import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    MinLength,
    IsMongoId,
    IsEnum,
    IsArray,
    ArrayNotEmpty,
    IsBoolean,
    ValidateIf,
} from 'class-validator';
import { ENUM_AUTH_ACCESS_FOR_DEFAULT } from 'src/common/auth/constants/auth.constant';

export class RoleCreateDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    @Type(() => String)
    readonly name: string;

    @IsMongoId({ each: true })
    @ArrayNotEmpty()
    @IsArray()
    @IsNotEmpty()
    readonly permissions: string[];

    @IsEnum(ENUM_AUTH_ACCESS_FOR_DEFAULT)
    @IsNotEmpty()
    readonly accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT;

    @IsBoolean()
    @IsNotEmpty()
    @ValidateIf((e) => e.isActive !== '')
    readonly isActive?: boolean;
}
