import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

export class SessionListResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    user: string;

    @ApiProperty({
        description: 'Date expired at',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    expiredAt: Date;
}
