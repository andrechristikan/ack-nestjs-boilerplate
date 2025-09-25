import { faker } from '@faker-js/faker';
import {
    ApiProperty,
    IntersectionType,
    OmitType,
    PartialType,
} from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from '@modules/api-key/dtos/request/api-key.update.request.dto';
import { ENUM_API_KEY_TYPE } from '@prisma/client';

export class ApiKeyCreateRequestDto extends IntersectionType(
    ApiKeyUpdateRequestDto,
    PartialType(ApiKeyUpdateDateRequestDto)
) {
    @ApiProperty({
        description: 'Api Key name',
        example: ENUM_API_KEY_TYPE.DEFAULT,
        required: true,
        enum: ENUM_API_KEY_TYPE,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_API_KEY_TYPE)
    type: ENUM_API_KEY_TYPE;
}

export class ApiKeyCreateRawRequestDto extends OmitType(
    ApiKeyCreateRequestDto,
    ['startAt', 'endAt'] as const
) {
    @ApiProperty({
        name: 'key',
        example: faker.string.alphanumeric(10),
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @ApiProperty({
        name: 'secret',
        example: faker.string.alphanumeric(20),
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}
