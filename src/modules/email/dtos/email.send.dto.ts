import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailSendDto {
    @ApiProperty({ required: true, example: faker.internet.username() })
    username: string;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    email: string;

    @ApiProperty({
        required: false,
        isArray: true,
        example: [faker.internet.email(), faker.internet.email()],
    })
    cc?: string[];

    @ApiProperty({
        required: false,
        isArray: true,
        example: [faker.internet.email(), faker.internet.email()],
    })
    bcc?: string[];
}
