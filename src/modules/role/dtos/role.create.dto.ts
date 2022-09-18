import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    MinLength,
    IsMongoId,
    IsEnum,
    IsArray,
    ArrayNotEmpty,
} from 'class-validator';
import { ENUM_AUTH_ACCESS_FOR_DEFAULT } from 'src/common/auth/constants/auth.enum.constant';

export class RoleCreateDto {
    @ApiProperty({
        description: 'Alias name of role',
        example: faker.name.jobTitle(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    @Type(() => String)
    readonly name: string;

    @ApiProperty({
        description: 'List of permission',
        example: [
            faker.database.mongodbObjectId(),
            faker.database.mongodbObjectId(),
        ],
        required: true,
    })
    @IsMongoId({ each: true })
    @ArrayNotEmpty()
    @IsArray()
    @IsNotEmpty()
    readonly permissions: string[];

    @ApiProperty({
        description: 'Representative for role',
        example: 'ADMIN',
        required: true,
    })
    @IsEnum(ENUM_AUTH_ACCESS_FOR_DEFAULT)
    @IsNotEmpty()
    readonly accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT;
}
