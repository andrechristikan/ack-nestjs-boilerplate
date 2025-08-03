import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Base database DTO class for API responses.
 *
 * Provides standardized fields for all database entities exposed through APIs.
 * Includes audit trail fields, soft delete information, and proper API documentation
 * with Swagger decorators.
 */
export class DatabaseDto {
    @ApiProperty({
        description: 'Alias id of api key',
        example: faker.string.uuid(),
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
        description: 'Flag for deleted',
        default: false,
        required: true,
    })
    deleted: boolean;

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

    @ApiProperty({
        description: 'Version of the document',
        example: 1,
        required: true,
    })
    __v: string;
}
