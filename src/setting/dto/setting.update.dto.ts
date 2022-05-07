import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { StringOrNumberOrBoolean } from 'src/utils/request/validation/request.string-or-number-or-boolean.validation';

export class SettingUpdateDto {
    @IsString()
    @IsOptional()
    @Type(() => String)
    @ValidateIf((e) => e.description !== '')
    readonly description?: string;

    @IsNotEmpty()
    @StringOrNumberOrBoolean()
    readonly value: string | boolean | number;
}
