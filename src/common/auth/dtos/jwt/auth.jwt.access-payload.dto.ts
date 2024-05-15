import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ENUM_AUTH_LOGIN_FROM } from 'src/common/auth/constants/auth.enum.constant';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

export class AuthJwtAccessPayloadPermissionDto {
    @ApiProperty({
        required: true,
        enum: ENUM_POLICY_SUBJECT,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    action: string;
}

export class AuthJwtAccessPayloadDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    readonly loginDate: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_AUTH_LOGIN_FROM,
    })
    readonly loginFrom: ENUM_AUTH_LOGIN_FROM;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly _id: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly email: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly role: string;

    @ApiProperty({
        required: true,
        nullable: false,
        enum: ENUM_POLICY_ROLE_TYPE,
    })
    readonly type: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        required: true,
        nullable: false,
        type: AuthJwtAccessPayloadPermissionDto,
        isArray: true,
        default: [],
    })
    @Type(() => AuthJwtAccessPayloadPermissionDto)
    readonly permissions: AuthJwtAccessPayloadPermissionDto[];
}
