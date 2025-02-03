import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class EmailVerificationDto {
    @ApiProperty({
        required: true,
        description: 'The OTP code',
    })
    otp: string;

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
