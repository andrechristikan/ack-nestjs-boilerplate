import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
    @ApiProperty({
        required: true,
        example: faker.string.alphanumeric(32),
        description: 'Verification token',
    })
    token: string;

    @ApiProperty({
        required: true,
        example: 'https://example.com/verify?token=abcdefg12345',
        description: 'Verification link',
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
    })
    reference: string;
}
