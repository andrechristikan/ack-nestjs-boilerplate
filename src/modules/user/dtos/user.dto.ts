import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_LOGIN_FROM,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
} from '@prisma/client';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';

export class UserDto extends DatabaseDto {
    @ApiProperty({
        required: false,
        maxLength: 100,
        minLength: 1,
    })
    name?: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    username: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: true,
    })
    isVerified: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
    })
    verifiedAt?: Date;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
        maxLength: 100,
    })
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    roleId: string;

    @ApiProperty({
        required: true,
        type: RoleDto,
        oneOf: [{ $ref: getSchemaPath(RoleDto) }],
    })
    @Type(() => RoleDto)
    role: RoleDto;

    @ApiProperty({
        required: false,
        example: faker.internet.password(),
        minLength: 6,
    })
    password?: string;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
    })
    passwordExpired?: Date;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
    })
    passwordCreated?: Date;

    @ApiProperty({ required: false, example: 0, minimum: 0 })
    passwordAttempt?: number;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    signUpDate: Date;

    @ApiProperty({
        required: true,
        example: ENUM_USER_SIGN_UP_FROM.admin,
        enum: ENUM_USER_SIGN_UP_FROM,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiProperty({
        required: true,
        example: ENUM_USER_SIGN_UP_WITH.credential,
        enum: ENUM_USER_SIGN_UP_WITH,
    })
    signUpWith: ENUM_USER_SIGN_UP_WITH;

    @ApiProperty({
        required: false,
        example: faker.string.alpha(10),
    })
    salt?: string;

    @ApiProperty({
        required: true,
        example: ENUM_USER_STATUS.active,
        enum: ENUM_USER_STATUS,
    })
    status: ENUM_USER_STATUS;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    countryId: string;

    @ApiProperty({
        example: ENUM_USER_GENDER.male,
        enum: ENUM_USER_GENDER,
        required: false,
    })
    gender?: ENUM_USER_GENDER;

    @ApiProperty({
        required: false,
        description: 'Last login time of user',
        example: faker.date.recent(),
    })
    lastLoginAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Last IP Address of user',
        example: faker.internet.ipv4(),
    })
    lastIPAddress?: string;

    @ApiProperty({
        required: false,
        enum: ENUM_USER_LOGIN_FROM,
        example: ENUM_USER_LOGIN_FROM.website,
    })
    lastLoginFrom?: ENUM_USER_LOGIN_FROM;

    @ApiProperty({
        required: false,
        enum: ENUM_USER_SIGN_UP_WITH,
        example: ENUM_USER_SIGN_UP_WITH.credential,
    })
    lastLoginWith?: ENUM_USER_SIGN_UP_WITH;

    @ApiProperty({
        required: true,
        type: UserTermPolicyDto,
        oneOf: [{ $ref: getSchemaPath(UserTermPolicyDto) }],
    })
    @Type(() => UserTermPolicyDto)
    termPolicy: UserTermPolicyDto;

    @ApiProperty({
        required: false,
        type: AwsS3Dto,
        oneOf: [{ $ref: getSchemaPath(AwsS3Dto) }],
    })
    @Type(() => AwsS3Dto)
    photo?: AwsS3Dto;
}
