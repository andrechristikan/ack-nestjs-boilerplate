import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IResult } from 'ua-parser-js';

export class AppHelloSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
        example: {
            ua: faker.internet.userAgent(),
            browser: {},
            engine: {},
            os: {},
            device: {},
            cpu: {},
        },
    })
    readonly userAgent: IResult;

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
