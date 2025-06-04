import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseUUIDDto } from 'src/common/database/dtos/database.uuid.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';

export class ActivityListResponseDto extends DatabaseUUIDDto {
    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    user: string;

    @ApiProperty({
        required: true,
        example: faker.lorem.paragraph(),
    })
    description: string;

    @ApiProperty({
        required: true,
        type: UserShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @Type(() => UserShortResponseDto)
    by: UserShortResponseDto;
}
