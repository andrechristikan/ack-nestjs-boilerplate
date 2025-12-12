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
        example: faker.date.future(),
        description: 'Expired at by date',
    })
    passwordExpiredAt: Date;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
        description: 'Password created at by date',
    })
    passwordCreatedAt: Date;
}
