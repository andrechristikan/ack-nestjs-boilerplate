import { faker } from '@faker-js/faker';
import {
    ApiProperty,
    IntersectionType,
    OmitType,
    PartialType,
} from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';
import { UserRequestDto } from 'src/modules/user/dtos/user.request.dto';

export class ApiKeyCreateDto extends IntersectionType(
    PartialType(ApiKeyUpdateDateDto),
    UserRequestDto
) {
    @ApiProperty({
        description: 'Api Key name',
        example: `testapiname`,
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @ApiProperty({
        description: 'Description of api key',
        example: 'blabla description',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    description?: string;
}

export class ApiKeyCreateRawDto extends ApiKeyCreateDto {
    @ApiProperty({
        name: 'key',
        example: faker.random.alphaNumeric(10),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @ApiProperty({
        name: 'secret',
        example: faker.random.alphaNumeric(20),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}

export class ApiKeyCreateByUserDto extends OmitType(ApiKeyCreateDto, [
    'user',
] as const) {}
