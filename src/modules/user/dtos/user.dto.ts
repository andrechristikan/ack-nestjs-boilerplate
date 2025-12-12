import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
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

    @ApiHideProperty()
    @Exclude()
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
        example: EnumUserSignUpFrom.admin,
        enum: EnumUserSignUpFrom,
    })
    signUpFrom: EnumUserSignUpFrom;

    @ApiProperty({
        required: true,
        example: EnumUserSignUpWith.credential,
        enum: EnumUserSignUpWith,
    })
    signUpWith: EnumUserSignUpWith;

    @ApiHideProperty()
    @Exclude()
    salt?: string;

    @ApiProperty({
        required: true,
        example: EnumUserStatus.active,
        enum: EnumUserStatus,
    })
    status: EnumUserStatus;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    countryId: string;

    @ApiProperty({
        example: EnumUserGender.male,
        enum: EnumUserGender,
        required: false,
    })
    gender?: EnumUserGender;

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
        enum: EnumUserLoginFrom,
        example: EnumUserLoginFrom.website,
    })
    lastLoginFrom?: EnumUserLoginFrom;

    @ApiProperty({
        required: false,
        enum: EnumUserSignUpWith,
        example: EnumUserSignUpWith.credential,
    })
    lastLoginWith?: EnumUserSignUpWith;

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
