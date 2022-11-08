import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class UserLoginSerialization {
    @ApiProperty({
        example: 'Bearer',
        required: true,
    })
    readonly tokenType: string;

    @ApiProperty({
        example: 1660190937231,
        description: 'Expire in timestamp',
        required: true,
    })
    readonly expiresIn: string;

    @ApiProperty({
        example: faker.random.alphaNumeric(30),
        description: 'Will be valid JWT Encode string',
        required: true,
    })
    readonly accessToken: string;

    @ApiProperty({
        example: faker.random.alphaNumeric(30),
        description: 'Will be valid JWT Encode string',
        required: true,
    })
    @ApiProperty()
    readonly refreshToken: string;
}
