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
import { EnumApiKeyType } from '@prisma/client';

export class ApiKeyCreateRequestDto extends IntersectionType(
    ApiKeyUpdateRequestDto,
    PartialType(ApiKeyUpdateDateRequestDto)
) {
    @ApiProperty({
        description: 'Api Key name',
        example: EnumApiKeyType.default,
        required: true,
        enum: EnumApiKeyType,
    })
    @IsNotEmpty()
    @IsEnum(EnumApiKeyType)
    type: EnumApiKeyType;
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
