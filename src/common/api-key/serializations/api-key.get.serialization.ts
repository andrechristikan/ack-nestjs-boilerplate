import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

export class ApiKeyGetSerialization {
    @ApiProperty({
        description: 'Id that representative with your target data',
        example: faker.datatype.uuid(),
        required: true,
    })
    @Type(() => String)
    readonly _id: string;

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
