import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class DatabaseIdResponseDto {
    @ApiProperty({
        description: 'Alias id of api key',
        example: faker.string.uuid(),
        required: true,
    })
    _id: string;
}
