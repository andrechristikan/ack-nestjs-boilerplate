import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingMiddlewareResponseDto {
    @ApiProperty({
        required: true,
        example: faker.number.int(),
    })
    bodyJson: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyJsonUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: faker.number.int(),
    })
    bodyRaw: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyRawUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: faker.number.int(),
    })
    bodyText: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyTextUnit: ENUM_SETTING_UNIT;

    @ApiProperty({
        required: true,
        example: faker.number.int(),
    })
    bodyUrlencoded: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    bodyUrlencodedUnit: ENUM_SETTING_UNIT;
}
