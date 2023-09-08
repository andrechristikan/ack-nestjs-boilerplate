import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { GreaterThanEqual } from 'src/common/request/validations/request.greater-than-equal.validation';
import { DateGreaterThanEqualToday } from 'src/common/request/validations/request.date-greater-than-equal-today.validation';

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
    @DateGreaterThanEqualToday()
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
    @GreaterThanEqual('startDate')
    endDate: Date;
}
