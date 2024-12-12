import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordCreteResponseDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    expiredDate: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.email(),
    })
    to: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.email(),
    })
    email: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.string.alphanumeric(),
    })
    token: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.url(),
    })
    url: string;
}
