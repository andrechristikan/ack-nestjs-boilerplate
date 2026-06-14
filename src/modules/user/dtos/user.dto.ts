import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';
import { UserTwoFactorDto } from '@modules/user/dtos/user.two-factor.dto';

export class UserDto extends DatabaseResponseDto {
    @ApiProperty({
        required: false,
        maxLength: 100,
        minLength: 1,
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    @Expose()
    username: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: true,
    })
    @Expose()
    isVerified: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
    })
    @Expose()
    verifiedAt?: Date;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
        maxLength: 100,
    })
    @Expose()
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    roleId: string;

    @ApiProperty({
        required: true,
        type: RoleDto,
    })
    @Expose()
    @Type(() => RoleDto)
    role: RoleDto;

    password?: string;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
    })
    @Expose()
    passwordExpired?: Date;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
    })
    @Expose()
    passwordCreated?: Date;

    @ApiProperty({ required: false, example: 0, minimum: 0 })
    @Expose()
    passwordAttempt?: number;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    @Expose()
    signUpDate: Date;

    @ApiProperty({
        required: true,
        example: EnumUserSignUpFrom.admin,
        enum: EnumUserSignUpFrom,
    })
    @Expose()
    signUpFrom: EnumUserSignUpFrom;

    @ApiProperty({
        required: true,
        example: EnumUserSignUpWith.credential,
        enum: EnumUserSignUpWith,
    })
    @Expose()
    signUpWith: EnumUserSignUpWith;

    @ApiProperty({
        required: true,
        example: EnumUserStatus.active,
        enum: EnumUserStatus,
    })
    @Expose()
    status: EnumUserStatus;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    countryId: string;

    @ApiProperty({
        example: EnumUserGender.male,
        enum: EnumUserGender,
        required: false,
    })
    @Expose()
    gender?: EnumUserGender;

    @ApiProperty({
        required: false,
        description: 'Last login time of user',
        example: faker.date.recent(),
    })
    @Expose()
    lastLoginAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Last IP Address of user',
        example: faker.internet.ipv4(),
    })
    @Expose()
    lastIPAddress?: string;

    @ApiProperty({
        required: false,
        enum: EnumUserLoginFrom,
        example: EnumUserLoginFrom.website,
    })
    @Expose()
    lastLoginFrom?: EnumUserLoginFrom;

    @ApiProperty({
        required: false,
        enum: EnumUserLoginWith,
        example: EnumUserLoginWith.credential,
    })
    @Expose()
    lastLoginWith?: EnumUserLoginWith;

    @ApiProperty({
        required: true,
        type: UserTermPolicyDto,
    })
    @Expose()
    @Type(() => UserTermPolicyDto)
    termPolicy: UserTermPolicyDto;

    @ApiProperty({
        required: false,
        type: AwsS3ResponseDto,
    })
    @Expose()
    @Type(() => AwsS3ResponseDto)
    photo?: AwsS3ResponseDto;

    @ApiProperty({
        required: true,
        type: UserTwoFactorDto,
    })
    @Expose()
    @Type(() => UserTwoFactorDto)
    twoFactor: UserTwoFactorDto;
}
