import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ApiKeyUpdateDateDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    endDate: Date;
}
