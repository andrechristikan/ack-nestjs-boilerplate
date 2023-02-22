import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ResponseIdSerialization } from 'src/common/response/serializations/response.id.serialization';

export class ApiKeyGetSerialization extends ResponseIdSerialization {
    @ApiProperty({
        description: 'Alias name of api key',
        example: faker.name.jobTitle(),
        required: true,
    })
    name: string;

    @ApiProperty({
        description: 'Description of api key',
        example: 'blabla description',
        required: false,
    })
    description?: string;

    @ApiProperty({
        description: 'Unique key of api key',
        example: faker.random.alpha(115),
        required: true,
    })
    key: string;

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
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    startDate?: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    endDate?: Date;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: false,
    })
    readonly updatedAt: Date;

    @Exclude()
    readonly deletedAt?: Date;
}
