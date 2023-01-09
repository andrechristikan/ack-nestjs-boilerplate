import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { MinGreaterThanEqual } from 'src/common/request/validations/request.min-greater-than-equal.validation';
import { MinDateToday } from 'src/common/request/validations/request.min-date-today.validation';

export class ApiKeyUpdateDateDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    @MinDateToday()
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    @MinGreaterThanEqual('startDate')
    endDate: Date;
}
