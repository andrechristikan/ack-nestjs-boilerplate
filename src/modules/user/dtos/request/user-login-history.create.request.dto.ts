import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UserLoginHistoryCreateRequest {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    readonly user: string;
}
