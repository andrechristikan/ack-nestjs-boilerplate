import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UserUpdateDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Type(() => String)
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Type(() => String)
    readonly lastName: string;
}
