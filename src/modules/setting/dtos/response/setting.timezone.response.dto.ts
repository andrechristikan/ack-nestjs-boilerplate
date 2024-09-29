import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class SettingTimezoneResponseDto {
    @ApiProperty({
        required: true,
        example: faker.date.timeZone(),
    })
    timezone: string;

    @ApiProperty({
        required: true,
        example: `+0${faker.number.int({ min: 0, max: 12 })}:00`,
    })
    timezoneOffset: string;
}
