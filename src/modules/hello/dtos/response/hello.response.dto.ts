import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    date: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    format: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1660190937231,
    })
    timestamp: number;
}
