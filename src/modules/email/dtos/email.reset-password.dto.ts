import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailResetPasswordDto {
    @ApiProperty({
        required: true,
        example: faker.internet.url(),
    })
    url: string;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
        description: 'Expired at by date',
    })
    expiredDate: Date;
}
