import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SettingFileSerialization } from 'src/modules/setting/serializations/setting.file.serialization';
import { SettingLanguageSerialization } from 'src/modules/setting/serializations/setting.language.serialization';
import { SettingTimezoneSerialization } from 'src/modules/setting/serializations/setting.timezone.serialization';

export class SettingCoreSerialization extends SettingLanguageSerialization {
    @ApiProperty({
        required: true,
        type: () => SettingFileSerialization,
        oneOf: [{ $ref: getSchemaPath(SettingFileSerialization) }],
    })
    @Type(() => SettingFileSerialization)
    file: SettingFileSerialization;

    @ApiProperty({
        required: true,
        type: () => SettingTimezoneSerialization,
        oneOf: [{ $ref: getSchemaPath(SettingTimezoneSerialization) }],
    })
    @Type(() => SettingTimezoneSerialization)
    timezone: SettingTimezoneSerialization;
}
