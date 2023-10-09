import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ENUM_AUTH_LOGIN_FROM,
    ENUM_AUTH_LOGIN_WITH,
} from 'src/common/auth/constants/auth.enum.constant';

export class AuthAccessPayloadSerialization {
    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly user: Record<string, any>;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    @Expose()
    readonly loginDate: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_AUTH_LOGIN_WITH,
    })
    @Expose()
    readonly loginWith: ENUM_AUTH_LOGIN_WITH;

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_AUTH_LOGIN_FROM,
    })
    @Expose()
    readonly loginFrom: ENUM_AUTH_LOGIN_FROM;
}
