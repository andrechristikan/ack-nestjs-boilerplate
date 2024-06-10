import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsOptional,
    IsUUID,
    ValidateNested,
    IsNotEmptyObject,
    IsObject,
} from 'class-validator';
import { UserUpdateMobileNumberDto } from 'src/modules/user/dtos/request/user.update-mobile-number.dto';

export class UserCreateRequestDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
        maxLength: 100,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly email: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    readonly role: string;

    @ApiProperty({
        example: faker.person.fullName(),
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    @Type(() => String)
    readonly name: string;

    @ApiProperty({
        example: faker.person.lastName(),
        required: false,
        maxLength: 50,
        minLength: 1,
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50)
    @Type(() => String)
    readonly familyName?: string;

    @ApiProperty({
        required: false,
        type: () => UserUpdateMobileNumberDto,
    })
    @ValidateNested()
    @IsNotEmptyObject()
    @IsObject()
    @IsOptional()
    @Type(() => UserUpdateMobileNumberDto)
    readonly mobileNumber?: UserUpdateMobileNumberDto;
}
