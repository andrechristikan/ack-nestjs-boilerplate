import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';
import { ResponseIdDto } from 'src/common/response/dtos/response/response.id.dto';

export class ApiKeyPayloadDto extends ResponseIdDto {
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
