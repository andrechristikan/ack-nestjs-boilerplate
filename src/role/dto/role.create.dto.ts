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
} from 'class-validator';
import { ENUM_ROLE_ACCESS_FOR_DEFAULT } from '../role.constant';

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

    @IsEnum(ENUM_ROLE_ACCESS_FOR_DEFAULT)
    @IsNotEmpty()
    readonly accessFor: ENUM_ROLE_ACCESS_FOR_DEFAULT;
}
