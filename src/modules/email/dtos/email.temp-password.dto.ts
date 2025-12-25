import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailTempPasswordDto {
    @ApiProperty({
        required: true,
        example: faker.string.alphanumeric(10),
        description: 'Expired at by date',
    })
    password: string;

    @ApiProperty({
        required: true,
        example: faker.date.future().toString(),
        description: 'Expired at by date',
    })
    passwordExpiredAt: string;

    @ApiProperty({
        required: true,
        example: faker.date.recent().toString(),
        description: 'Password created at by date',
    })
    passwordCreatedAt: string;
}
