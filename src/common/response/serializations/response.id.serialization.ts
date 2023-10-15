import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ResponseIdSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.string.uuid(),
        required: true,
        nullable: false,
    })
    @Type(() => String)
    _id: string;
}
