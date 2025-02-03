import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export class AuthJwtAccessPayloadDto {
    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    loginDate: Date;

    @ApiProperty({
        required: true,

        enum: ENUM_AUTH_LOGIN_FROM,
    })
    loginFrom: ENUM_AUTH_LOGIN_FROM;

    @ApiProperty({
        required: true,
    })
    user: string;

    @ApiProperty({
        required: true,
    })
    email: string;

    @ApiProperty({
        required: true,
    })
    session: string;

    @ApiProperty({
        required: true,
    })
    role: string;

    @ApiProperty({
        required: true,
        enum: ENUM_POLICY_ROLE_TYPE,
    })
    type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        required: false,
    })
    iat?: number;

    @ApiProperty({
        required: false,
    })
    nbf?: number;

    @ApiProperty({
        required: false,
    })
    exp?: number;

    @ApiProperty({
        required: false,
    })
    aud?: string;

    @ApiProperty({
        required: false,
    })
    iss?: string;

    @ApiProperty({
        required: false,
    })
    sub?: string;
}
