import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApiKeyCreateSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.datatype.uuid(),
        required: true,
    })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        description: 'Secret key of ApiKey, only show at once',
        example: true,
        required: true,
    })
    secret: string;

    @ApiProperty({
        description: 'Api key ',
        example: true,
        required: true,
    })
    key: string;
}
