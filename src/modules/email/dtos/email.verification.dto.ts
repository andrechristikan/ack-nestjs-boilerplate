import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
    @ApiProperty({
        required: true,
        example: 'https://example.com/verify?token=abcdefg12345',
    })
    link: string;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
        description: 'Expired at by date',
    })
    expiredAt: Date;

    @ApiProperty({
        required: true,
        example: 15,
        description: 'Expired in minutes',
    })
    expiredInMinutes: number;

    @ApiProperty({
        required: true,
    })
    reference: string;
}
