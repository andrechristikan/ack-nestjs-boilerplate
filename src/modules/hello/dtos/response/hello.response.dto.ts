import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    date: Date;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    format: string;

    @ApiProperty({
        required: true,
        example: 1660190937231,
    })
    timestamp: number;
}
