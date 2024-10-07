import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SessionWorkerDto {
    @ApiProperty({
        required: true,
        example: faker.string.uuid(),
    })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    session: string;
}
