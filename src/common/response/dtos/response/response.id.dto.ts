import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseIdDto {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.string.uuid(),
        required: true,
        nullable: false,
    })
    _id: string;
}
