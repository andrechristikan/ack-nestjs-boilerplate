import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UserUpdateValidation {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Transform(
        ({ value }) =>
            typeof value === 'string' ? value.toLowerCase() : value,
        { toClassOnly: true }
    )
    readonly lastName: string;
}
