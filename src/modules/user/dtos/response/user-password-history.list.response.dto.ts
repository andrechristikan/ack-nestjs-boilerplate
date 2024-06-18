import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

export class UserPasswordHistoryListResponseDto extends DatabaseIdResponseDto {
    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    readonly user: string;

    @ApiHideProperty()
    @Exclude()
    readonly password: string;

    @ApiProperty({
        description: 'Date created at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly createdAt: Date;

    @ApiProperty({
        description: 'Date updated at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    readonly updatedAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly deletedAt?: Date;
}
