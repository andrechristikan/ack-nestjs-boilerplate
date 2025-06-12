import { IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SettingValue } from '@modules/setting/interfaces/setting.interface';

class SettingJsonDto {
    @IsBoolean()
    @Type(() => Boolean)
    @IsNotEmpty()
    enabled: boolean;

    [key: string]: SettingValue;
}

export class SettingFeatureCreateRequestDto {
    @IsNotEmpty()
    @IsString()
    key: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => SettingJsonDto)
    value: SettingJsonDto;
}
