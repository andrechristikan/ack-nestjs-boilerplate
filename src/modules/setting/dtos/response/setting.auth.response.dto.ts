import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingAuthResponseDto {
    @ApiProperty({
        required: true,
    })
    passwordMaxAttempt: number;

    @ApiProperty({
        required: true,
    })
    passwordExpiredIn: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.MILLISECOND,
        enum: ENUM_SETTING_UNIT,
    })
    passwordExpiredInUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
    })
    passwordExpiredInTemporary: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.MILLISECOND,
        enum: ENUM_SETTING_UNIT,
    })
    passwordExpiredInTemporaryUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
    })
    passwordPeriod: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.MILLISECOND,
        enum: ENUM_SETTING_UNIT,
    })
    passwordPeriodUnit: ENUM_SETTING_UNIT;
}
