import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ApiKeyResponseDto extends DatabaseResponseDto {
    hash: string;

    @ApiProperty({
        description: 'Active flag of api key',
        example: true,
        required: true,
    })
    @Expose()
    isActive: boolean;

    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.past(),
        required: false,
    })
    @Expose()
    startAt?: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.future(),
        required: false,
    })
    @Expose()
    endAt?: Date;

    @ApiProperty({
        description: 'Name of api key',
        example: faker.string.alpha(10),
        required: true,
    })
    @Expose()
    name: string;

    @ApiProperty({
        description: 'Type of api key',
        example: EnumApiKeyType.default,
        enum: EnumApiKeyType,
        required: true,
    })
    @Expose()
    type: EnumApiKeyType;

    @ApiProperty({
        description: 'Unique key of api key',
        example: faker.string.alpha(15),
        required: true,
    })
    @Expose()
    key: string;
}
