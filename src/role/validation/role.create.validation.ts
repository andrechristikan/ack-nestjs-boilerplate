import { Transform } from 'class-transformer';
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
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly name: string;

    @IsMongoId({ each: true })
    @IsNotEmpty()
    readonly permissions: string[];
}
