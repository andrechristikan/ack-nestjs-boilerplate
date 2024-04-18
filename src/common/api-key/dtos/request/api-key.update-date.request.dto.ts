import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';

export class ApiKeyUpdateDateRequestDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    // @DateGreaterThanEqualToday()
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    // @GreaterThanEqual('startDate')
    endDate: Date;
}
