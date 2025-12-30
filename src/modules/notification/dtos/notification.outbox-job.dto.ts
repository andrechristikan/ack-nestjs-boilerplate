import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { IsNotEmpty, IsString } from 'class-validator';

export class NotificationOutboxJobDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @IsString()
    @IsNotEmpty()
    outboxId: string;
}
