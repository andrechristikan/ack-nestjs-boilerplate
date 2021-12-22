import { Transform, Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    IsOptional,
    ValidateIf
} from 'class-validator';

export class UserUpdateValidation {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly firstName: string;

    @IsString()
    @IsOptional()
    @ValidateIf((e) => e.lastName !== '')
    @MaxLength(30)
    @Type(() => String)
    @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
    readonly lastName?: string;
}
