import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { SettingAuthResponseDto } from 'src/modules/setting/dtos/response/setting.auth.response.dto';
import { SettingFileResponseDto } from 'src/modules/setting/dtos/response/setting.file.response.dto';
import { SettingLanguageResponseDto } from 'src/modules/setting/dtos/response/setting.language.response.dto';
import { SettingMiddlewareResponseDto } from 'src/modules/setting/dtos/response/setting.middleware.response.dto';
import { SettingTimezoneResponseDto } from 'src/modules/setting/dtos/response/setting.timezone.response.dto';
import { SettingUserResponseDto } from 'src/modules/setting/dtos/response/setting.user.response.dto';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingCoreResponseDto {
    @ApiProperty({
        required: true,
    })
    name: string;

    @ApiProperty({
        required: true,
        enum: ENUM_APP_ENVIRONMENT,
        example: ENUM_APP_ENVIRONMENT.DEVELOPMENT,
    })
    env: ENUM_APP_ENVIRONMENT;

    @ApiProperty({
        required: true,
    })
    timeout: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.MILLISECOND,
        enum: ENUM_SETTING_UNIT,
    })
    timeoutUnit: ENUM_SETTING_UNIT;

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

    @ApiProperty({
        required: true,
        type: SettingMiddlewareResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingMiddlewareResponseDto) }],
    })
    @Type(() => SettingMiddlewareResponseDto)
    middleware: SettingMiddlewareResponseDto;

    @ApiProperty({
        required: true,
        type: SettingAuthResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingAuthResponseDto) }],
    })
    @Type(() => SettingAuthResponseDto)
    auth: SettingAuthResponseDto;

    @ApiProperty({
        required: true,
        type: SettingUserResponseDto,
        oneOf: [{ $ref: getSchemaPath(SettingUserResponseDto) }],
    })
    @Type(() => SettingUserResponseDto)
    user: SettingUserResponseDto;
}
