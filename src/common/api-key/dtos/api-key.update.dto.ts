import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DateGreaterThanEqualToday } from 'src/common/request/validations/request.date-greater-than-equal-today.validation';
import { faker } from '@faker-js/faker';
import { GreaterThanEqual } from 'src/common/request/validations/request.greater-than-equal.validation';

export class ApiKeyUpdateDateDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    @DateGreaterThanEqualToday()
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    @GreaterThanEqual('startDate')
    endDate: Date;
}

export class ApiKeyUpdateDto {
    @ApiProperty({
        description: 'Api Key name',
        example: `testapiname`,
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;
}
