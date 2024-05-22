import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';

export class ApiKeyPayloadDto extends DatabaseIdResponseDto {
    @ApiProperty({
        description: 'Alias name of api key',
        example: faker.person.jobTitle(),
        required: true,
        nullable: false,
    })
    name: string;

    @ApiProperty({
        description: 'Type of api key',
        example: ENUM_API_KEY_TYPE.PUBLIC,
        required: true,
        nullable: false,
    })
    type: ENUM_API_KEY_TYPE;

    @ApiProperty({
        description: 'Unique key of api key',
        example: faker.string.alpha(15),
        required: true,
        nullable: false,
    })
    key: string;
}
