import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProjectResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    workspaceId: string;

    @ApiProperty({
        required: true,
        description: 'Project name',
        example: 'Website Revamp',
    })
    @Expose()
    name: string;

    @ApiProperty({
        required: true,
        description: 'Project slug',
        example: 'website-revamp',
    })
    @Expose()
    slug: string;

    @ApiProperty({
        required: false,
        description: 'Project description',
        example: 'Marketing site redesign',
        nullable: true,
    })
    @Expose()
    description: string | null;
}
