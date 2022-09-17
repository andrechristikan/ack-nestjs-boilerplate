import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IResult } from 'ua-parser-js';

export class AppHelloSerialization {
    @ApiProperty({
        example: {
            ua: 'PostmanRuntime/7.29.0',
            browser: {},
            engine: {},
            os: {},
            device: {},
            cpu: {},
        },
    })
    readonly userAgent: IResult;

    @ApiProperty({ example: faker.date.recent() })
    @Type(() => String)
    readonly date: Date;

    @ApiProperty({ example: faker.date.recent() })
    readonly format: string;

    @ApiProperty({
        example: 1660190937231,
    })
    readonly timestamp: number;
}
