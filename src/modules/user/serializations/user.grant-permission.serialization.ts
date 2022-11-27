import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class UserGrantPermissionSerialization {
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
    readonly permissionToken: string;
}
