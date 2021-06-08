import {
    IsString,
    IsNotEmpty,
    MaxLength,
    IsArray,
    IsOptional
} from 'class-validator';
import { Default } from 'src/utils/class-validator.decorator';

export class UserUpdateValidation {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    readonly firstName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    readonly lastName: string;

    @IsArray()
    @Default([])
    @IsOptional()
    @MaxLength(3)
    readonly savedPlaces: string;
}
