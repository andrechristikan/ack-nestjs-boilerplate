import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Base response DTO carrying standard audit fields present on every database document.
 *
 * Extended by domain-specific response DTOs to include common metadata such as
 * `id`, timestamps, and soft-delete tracking fields.
 */
export class DatabaseResponseDto {
    @ApiProperty({
        description: 'Database document identifier',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: 'created by',
        required: false,
        nullable: true,
    })
    @Expose()
    createdBy: string | null;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
    })
    @Expose()
    updatedAt: Date;

    @ApiProperty({
        description: 'updated by',
        required: false,
        nullable: true,
    })
    @Expose()
    updatedBy: string | null;

    @ApiProperty({
        description: 'Date delete at',
        required: false,
        nullable: true,
    })
    @Expose()
    deletedAt: Date | null;

    @ApiProperty({
        description: 'Delete by',
        required: false,
        nullable: true,
    })
    @Expose()
    deletedBy: string | null;
}
