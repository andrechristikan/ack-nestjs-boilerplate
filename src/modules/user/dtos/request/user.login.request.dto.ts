import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { faker } from '@faker-js/faker';
import { UserDeviceDto } from '@modules/user/dtos/request/user.device.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumUserLoginFrom } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsString,
    ValidateNested,
} from 'class-validator';

export class UserLoginRequestDto {
    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    @IsString()
    @IsNotEmpty()
    @IsCustomEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        description: 'string password',
        required: true,
        example: faker.string.alphanumeric(10),
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        description: 'from where the user is logging in',
        enum: EnumUserLoginFrom,
        example: EnumUserLoginFrom.website,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumUserLoginFrom)
    from: EnumUserLoginFrom;

    @ApiProperty({
        description: 'Device information',
        required: true,
        type: UserDeviceDto,
    })
    @Type(() => UserDeviceDto)
    @IsNotEmpty()
    @IsObject()
    @IsNotEmptyObject()
    @ValidateNested()
    device: UserDeviceDto;
}
