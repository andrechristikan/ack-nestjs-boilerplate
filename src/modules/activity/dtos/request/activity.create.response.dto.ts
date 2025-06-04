import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ActivityCreateResponse {
    @ApiProperty({
        example: faker.lorem.paragraph(),
        description: 'Description of the activity',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    description: string;
}
