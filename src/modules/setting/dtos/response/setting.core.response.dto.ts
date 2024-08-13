import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SettingFileResponseDto } from 'src/modules/setting/dtos/response/setting.file.response.dto';
import { SettingLanguageResponseDto } from 'src/modules/setting/dtos/response/setting.language.response.dto';
import { SettingTimezoneResponseDto } from 'src/modules/setting/dtos/response/setting.timezone.response.dto';

export class SettingCoreResponseDto {
    @ApiProperty({
        required: true,
        type: SettingFileResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingFileResponseDto) }],
    })
    @Type(() => SettingFileResponseDto)
    file: SettingFileResponseDto;

    @ApiProperty({
        required: true,
        type: SettingLanguageResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingLanguageResponseDto) }],
    })
    @Type(() => SettingLanguageResponseDto)
    language: SettingLanguageResponseDto;

    @ApiProperty({
        required: true,
        type: SettingTimezoneResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingTimezoneResponseDto) }],
    })
    @Type(() => SettingTimezoneResponseDto)
    timezone: SettingTimezoneResponseDto;
}
