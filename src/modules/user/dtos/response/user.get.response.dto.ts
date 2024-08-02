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
    name: string;

    @ApiProperty({
        required: false,
        type: UserUpdateMobileNumberRequestDto,
    })
    @Type(() => UserUpdateMobileNumberRequestDto)
    mobileNumber?: UserUpdateMobileNumberRequestDto;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.email(),
        maxLength: 100,
    })
    email: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.string.uuid(),
    })
    role: string;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.future(),
    })
    passwordExpired: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.past(),
    })
    passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    passwordAttempt: number;

    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.date.recent(),
    })
    signUpDate: Date;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ENUM_USER_SIGN_UP_FROM.ADMIN,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    salt: string;

    @ApiProperty({
        required: true,
        nullable: false,
        example: ENUM_USER_STATUS.ACTIVE,
    })
    status: ENUM_USER_STATUS;

    @ApiProperty({
        nullable: true,
        required: false,
        type: AwsS3Dto,
        oneOf: [{ $ref: getSchemaPath(AwsS3Dto) }],
    })
    @Type(() => AwsS3Dto)
    photo?: AwsS3Dto;

    @ApiProperty({
        example: ENUM_USER_GENDER.MALE,
        enum: ENUM_USER_GENDER,
        required: false,
        nullable: true,
    })
    gender?: ENUM_USER_GENDER;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    country: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    deletedAt?: Date;
}
