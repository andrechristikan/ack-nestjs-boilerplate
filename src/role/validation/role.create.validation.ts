import { Transform, Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    MinLength,
    IsArray,
    IsMongoId
} from 'class-validator';

export class RoleCreateValidation {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly name: string;

    @IsMongoId({ each: true })
    @IsNotEmpty()
    readonly permissions: string[];
}
