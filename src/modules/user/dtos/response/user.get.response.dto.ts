import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';

export class UserGetResponseDto extends DatabaseIdResponseDto {
    @ApiProperty({
        required: true,
        nullable: false,
        maxLength: 100,
        minLength: 1,
    })
    readonly name: string;

    @ApiProperty({
        required: false,
        maxLength: 50,
        minLength: 1,
    })
    readonly familyName?: string;

    @ApiProperty({
        required: false,
        type: () => UserUpdateMobileNumberRequestDto,
    })
    @Type(() => UserUpdateMobileNumberRequestDto)
    readonly mobileNumber?: UserUpdateMobileNumberRequestDto;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.email(),
        maxLength: 100,
    })
    readonly email: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.string.uuid(),
    })
    readonly role: string;

    @ApiHideProperty()
    @Exclude()
    readonly password: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.future(),
    })
    readonly passwordExpired: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.past(),
    })
    readonly passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordAttempt: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    readonly signUpDate: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ENUM_USER_SIGN_UP_FROM.ADMIN,
    })
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    readonly salt: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ENUM_USER_STATUS.ACTIVE,
    })
    readonly status: ENUM_USER_STATUS;

    @ApiProperty({
        required: true,
        nullable: false,
        example: false,
    })
    readonly blocked: boolean;

    @ApiProperty({
        nullable: true,
        required: false,
        type: () => AwsS3Dto,
        oneOf: [{ $ref: getSchemaPath(AwsS3Dto) }],
    })
    @Type(() => AwsS3Dto)
    readonly photo?: AwsS3Dto;

    @ApiProperty({
        required: false,
        nullable: true,
    })
    readonly address?: string;

    @ApiProperty({
        example: ENUM_USER_GENDER.MALE,
        enum: ENUM_USER_GENDER,
        required: false,
        nullable: true,
    })
    readonly gender?: ENUM_USER_GENDER;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    readonly country: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly deletedAt?: Date;
}
