import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

export class UserLoginSerialization {
    @ApiProperty({
        example: 'Bearer',
        required: true,
        nullable: false,
    })
    readonly tokenType: string;

    @ApiProperty({
        example: ENUM_ROLE_TYPE.USER,
        enum: ENUM_ROLE_TYPE,
        required: true,
        nullable: false,
    })
    readonly roleType: ENUM_ROLE_TYPE;

    @ApiProperty({
        example: 3600,
        description: 'timestamp in minutes',
        required: true,
        nullable: false,
    })
    readonly expiresIn: number;

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
