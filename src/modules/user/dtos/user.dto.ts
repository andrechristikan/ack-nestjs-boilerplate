import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';
import { UserTwoFactorDto } from '@modules/user/dtos/user.two-factor.dto';

export class UserDto extends DatabaseResponseDto {
    @ApiProperty({
        required: false,
        maxLength: 100,
        minLength: 1,
        description: 'Display name of the user',
        example: faker.person.fullName(),
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
        description: 'Unique username of the user',
        example: faker.internet.username().toLowerCase(),
    })
    @Expose()
    username: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: true,
        description: 'Whether the user email is verified',
    })
    @Expose()
    isVerified: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
        description: 'When the user email was verified',
    })
    @Expose()
    verifiedAt?: Date;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
        maxLength: 100,
        description: 'Email address of the user',
    })
    @Expose()
    email: Lowercase<string>;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the role assigned to the user',
    })
    @Expose()
    roleId: string;

    @ApiProperty({
        required: true,
        type: RoleDto,
        description: 'Role assigned to the user',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.person.jobTitle(),
            description: faker.lorem.sentence(),
            type: EnumRoleType.admin,
            abilities: [],
        },
    })
    @Expose()
    @Type(() => RoleDto)
    role: RoleDto;

    password?: string;

    @ApiProperty({
        required: false,
        example: faker.date.future(),
        description: 'When the current password expires',
    })
    @Expose()
    passwordExpired?: Date;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
        description: 'When the current password was created',
    })
    @Expose()
    passwordCreated?: Date;

    @ApiProperty({
        required: false,
        example: 0,
        minimum: 0,
        description: 'Count of consecutive failed password attempts',
    })
    @Expose()
    passwordAttempt?: number;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
        description: 'When the user signed up',
    })
    @Expose()
    signUpDate: Date;

    @ApiProperty({
        required: true,
        example: EnumUserSignUpFrom.admin,
        enum: EnumUserSignUpFrom,
        description: 'Channel the user signed up from',
    })
    @Expose()
    signUpFrom: EnumUserSignUpFrom;

    @ApiProperty({
        required: true,
        example: EnumUserSignUpWith.credential,
        enum: EnumUserSignUpWith,
        description: 'Credential method the user signed up with',
    })
    @Expose()
    signUpWith: EnumUserSignUpWith;

    @ApiProperty({
        required: true,
        example: EnumUserStatus.active,
        enum: EnumUserStatus,
        description: 'Account status of the user',
    })
    @Expose()
    status: EnumUserStatus;

    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user country',
    })
    @Expose()
    countryId: string;

    @ApiProperty({
        example: EnumUserGender.male,
        enum: EnumUserGender,
        required: false,
        description: 'Gender of the user',
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
        description: 'Channel of the last login',
    })
    @Expose()
    lastLoginFrom?: EnumUserLoginFrom;

    @ApiProperty({
        required: false,
        enum: EnumUserLoginWith,
        example: EnumUserLoginWith.credential,
        description: 'Credential method of the last login',
    })
    @Expose()
    lastLoginWith?: EnumUserLoginWith;

    @ApiProperty({
        required: true,
        type: UserTermPolicyDto,
        description: 'Term-policy acceptance flags for the user',
        example: {
            [EnumTermPolicyType.termsOfService]: true,
            [EnumTermPolicyType.privacy]: true,
            [EnumTermPolicyType.cookies]: true,
            [EnumTermPolicyType.marketing]: false,
        },
    })
    @Expose()
    @Type(() => UserTermPolicyDto)
    termPolicy: UserTermPolicyDto;

    @ApiProperty({
        required: false,
        type: AwsS3ResponseDto,
        description: 'Profile photo stored in S3',
        example: {
            bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
            key: faker.system.filePath(),
            cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
            completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
            mime: 'image/jpeg',
            extension: 'jpg',
            access: EnumAwsS3Accessibility.public,
            size: 1024,
        },
    })
    @Expose()
    @Type(() => AwsS3ResponseDto)
    photo?: AwsS3ResponseDto;

    @ApiProperty({
        required: true,
        type: UserTwoFactorDto,
        description: 'Two-factor authentication state of the user',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            userId: faker.database.mongodbObjectId(),
            enabled: false,
            requiredSetup: false,
            confirmedAt: faker.date.past(),
        },
    })
    @Expose()
    @Type(() => UserTwoFactorDto)
    twoFactor: UserTwoFactorDto;
}
