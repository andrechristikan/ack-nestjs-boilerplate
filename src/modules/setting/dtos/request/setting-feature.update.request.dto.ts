import {
    IsBoolean,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SettingValue } from '@modules/setting/interfaces/setting.interface';
import { ApiProperty } from '@nestjs/swagger';

class SettingFeatureJsonDto {
    @ApiProperty({
        description: 'Indicates if the setting is enabled',
        example: true,
    })
    @IsBoolean()
    @Type(() => Boolean)
    @IsNotEmpty()
    enabled: boolean;

    [key: string]: SettingValue;
}

export class SettingFeatureUpdateRequestDto {
    @ApiProperty({
        description: 'Human-readable description of the setting feature',
        example: 'Enable or disable Google authentication',
    })
    @IsNotEmpty()
    @IsString()
    description: string;

    @ApiProperty({
        description:
            'Configuration object that includes the enabled flag and additional properties',
        type: () => SettingFeatureJsonDto,
        example: {
            enabled: true,
            provider: 'google',
            scopes: ['email', 'profile'],
        },
    })
    @IsNotEmpty()
    @IsObject()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => SettingFeatureJsonDto)
    value: SettingFeatureJsonDto;
}
