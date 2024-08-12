import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DatabaseSoftDeleteDto {
    @ApiProperty({
        description: 'Alias id of api key',
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    deletedBy: string;
}
