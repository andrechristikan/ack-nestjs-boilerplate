import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class DatabaseDto {
    @ApiProperty({
        description: 'Database document identifier',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    id: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'created by',
        required: false,
    })
    createdBy?: string;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'updated by',
        required: false,
    })
    updatedBy?: string;

    @ApiProperty({
        description: 'Date delete at',
        required: false,
    })
    deletedAt?: Date;

    @ApiProperty({
        description: 'Delete by',
        required: false,
    })
    deletedBy?: string;
}
