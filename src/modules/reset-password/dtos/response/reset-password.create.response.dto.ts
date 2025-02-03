import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordCreteResponseDto {
    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    expiredDate: Date;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    to: string;

    @ApiProperty({
        required: true,
        example: faker.string.alphanumeric(),
    })
    token: string;

    @ApiProperty({
        required: true,
        example: faker.internet.url(),
    })
    url: string;
}
