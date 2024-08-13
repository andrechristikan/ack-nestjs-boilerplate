import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

export class ApiKeyGetResponseDto extends DatabaseDto {
    @ApiHideProperty()
    @Exclude()
    hash: string;

    @ApiProperty({
        description: 'Active flag of api key',
        example: true,
        required: true,
        nullable: false,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.past(),
        required: false,
        nullable: true,
    })
    startDate?: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.future(),
        required: false,
        nullable: true,
    })
    endDate?: Date;

    @ApiProperty({
        description: 'Alias name of api key',
        example: faker.person.jobTitle(),
        required: true,
        nullable: false,
    })
    name: string;

    @ApiProperty({
        description: 'Type of api key',
        example: ENUM_API_KEY_TYPE.DEFAULT,
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
