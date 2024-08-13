import { faker } from '@faker-js/faker';
import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';

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
