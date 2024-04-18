import { faker } from '@faker-js/faker';
import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ApiKeyUpdateDateRequestDto } from 'src/common/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateNameRequestDto } from 'src/common/api-key/dtos/request/api-key.update-name.request.dto';

export class ApiKeyCreateRequestDto extends IntersectionType(
    ApiKeyUpdateNameRequestDto,
    PartialType(ApiKeyUpdateDateRequestDto)
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

export class ApiKeyCreateRawRequestDto extends ApiKeyCreateRequestDto {
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
