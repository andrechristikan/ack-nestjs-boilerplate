import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AppHelloSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    @Type(() => String)
    readonly date: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    readonly format: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: 1660190937231,
    })
    readonly timestamp: number;
}
