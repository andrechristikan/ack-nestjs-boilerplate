import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class ApiKeyResponseDto extends DatabaseDto {
    @ApiHideProperty()
    @Exclude()
    hash: string;

    @ApiProperty({
        description: 'Active flag of api key',
        example: true,
        required: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.past(),
        required: false,
    })
    startAt?: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.future(),
        required: false,
    })
    endAt?: Date;

    @ApiProperty({
        description: 'Name of api key',
        example: faker.string.alpha(10),
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Type of api key',
        example: EnumApiKeyType.default,
        enum: EnumApiKeyType,
        required: true,
    })
    type: EnumApiKeyType;

    @ApiProperty({
        description: 'Unique key of api key',
        example: faker.string.alpha(15),
        required: true,
    })
    key: string;
}
