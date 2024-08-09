import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class DatabaseDto {
    @ApiProperty({
        description: 'Alias id of api key',
        example: faker.string.uuid(),
        required: true,
    })
    _id: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'Flag for deleted',
        default: false,
        required: true,
        nullable: false,
    })
    deleted: boolean;

    @ApiProperty({
        description: 'Date delete at',
        required: false,
        nullable: true,
    })
    deletedAt?: Date;

    @ApiProperty({
        description: 'Delete by',
        required: false,
        nullable: true,
    })
    deletedBy?: string;
}
