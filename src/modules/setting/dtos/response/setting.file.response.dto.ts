import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_SETTING_UNIT } from 'src/modules/setting/enums/setting.enum';

export class SettingFileResponseDto {
    @ApiProperty({
        required: true,
        example: faker.number.int(),
    })
    size: number;

    @ApiProperty({
        required: true,
        example: ENUM_SETTING_UNIT.BYTE,
        enum: ENUM_SETTING_UNIT,
    })
    sizeUnit: ENUM_SETTING_UNIT;
}
