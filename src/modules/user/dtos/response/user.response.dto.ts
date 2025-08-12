import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from '@modules/user/enums/user.enum';
import { UserUpdateMobileNumberRequestDto } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserVerificationResponseDto } from '@modules/user/dtos/response/user.verification.response.dto';
import { DatabaseDto } from '@common/database/dtos/database.dto';
import { RoleResponseDto } from '@modules/role/dtos/response/role.response.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';

export class UserGetResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    name: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    username: string;

    @ApiProperty({
        required: false,
        type: UserUpdateMobileNumberRequestDto,
        oneOf: [{ $ref: getSchemaPath(UserUpdateMobileNumberRequestDto) }],
    })
    @Type(() => UserUpdateMobileNumberRequestDto)
    mobileNumber?: UserUpdateMobileNumberRequestDto;

    @ApiProperty({
        required: true,
        example: faker.internet.email(),
        maxLength: 100,
    })
    email: string;

    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    roleId: string;

    @ApiProperty({
        required: false,
        type: RoleResponseDto,
        oneOf: [{ $ref: getSchemaPath(RoleResponseDto) }],
    })
    @Type(() => RoleResponseDto)
    role?: RoleResponseDto;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiHideProperty()
    @Exclude()
    salt: string;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    passwordExpired: Date;

    @ApiProperty({
        required: true,
        example: faker.date.past(),
    })
    passwordCreated: Date;

    @ApiProperty({
        required: true,
        example: 0,
    })
    passwordAttempt: number;

    @ApiProperty({
        required: true,
        example: faker.date.recent(),
    })
    signUpDate: Date;

    @ApiProperty({
        required: true,
        example: ENUM_USER_SIGN_UP_FROM.ADMIN,
        enum: ENUM_USER_SIGN_UP_FROM,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiProperty({
        required: true,
        example: ENUM_USER_STATUS.ACTIVE,
        enum: ENUM_USER_STATUS,
    })
    status: ENUM_USER_STATUS;

    @ApiProperty({
        required: false,
        type: AwsS3Dto,
        oneOf: [{ $ref: getSchemaPath(AwsS3Dto) }],
    })
    @Type(() => AwsS3Dto)
    profilePhoto?: AwsS3Dto;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    countryId: string;

    @ApiProperty({
        type: CountryResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryResponseDto) }],
        required: false,
    })
    @Type(() => CountryResponseDto)
    country?: CountryResponseDto;

    @ApiProperty({
        example: faker.person.lastName(),
        required: true,
        type: UserVerificationResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserVerificationResponseDto) }],
    })
    @Type(() => UserVerificationResponseDto)
    verification: UserVerificationResponseDto;
}
