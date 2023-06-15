import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class UserLoginSerialization {
    @ApiProperty({
        example: 'Bearer',
        required: true,
        nullable: false,
    })
    readonly tokenType: string;

    @ApiProperty({
        example: 1660190937231,
        description: 'Expire in timestamp',
        required: true,
        nullable: false,
    })
    readonly expiresIn: string;

    @ApiProperty({
        example: faker.string.alphanumeric(30),
        description: 'Will be valid JWT Encode string',
        required: true,
        nullable: false,
    })
    readonly accessToken: string;

    @ApiProperty({
        example: faker.string.alphanumeric(30),
        description: 'Will be valid JWT Encode string',
        required: true,
        nullable: false,
    })
    readonly refreshToken: string;
}
