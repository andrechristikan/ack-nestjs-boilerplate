import { faker } from '@faker-js/faker';
import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import {
    ApiKeyUpdateDateDto,
    ApiKeyUpdateDto,
} from 'src/common/api-key/dtos/api-key.update.dto';

export class ApiKeyCreateDto extends IntersectionType(
    ApiKeyUpdateDto,
    PartialType(ApiKeyUpdateDateDto)
) {
    @ApiProperty({
        description: 'Api Key name',
        example: ENUM_API_KEY_TYPE.PUBLIC,
        required: true,
        enum: ENUM_API_KEY_TYPE,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_API_KEY_TYPE)
    type: ENUM_API_KEY_TYPE;
}

export class ApiKeyCreateRawDto extends ApiKeyCreateDto {
    @ApiProperty({
        name: 'key',
        example: faker.string.alphanumeric(10),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @ApiProperty({
        name: 'secret',
        example: faker.string.alphanumeric(20),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}
