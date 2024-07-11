import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailSendDto {
    @ApiProperty({
        type: 'string',
        example: faker.person.fullName(),
    })
    name: string;

    @ApiProperty({
        type: 'string',
        example: faker.internet.email(),
    })
    email: string;
}
