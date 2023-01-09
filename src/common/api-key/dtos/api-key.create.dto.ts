import { faker } from '@faker-js/faker';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDate,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { MinGreaterThanEqual } from 'src/common/request/validations/request.min-greater-than-equal.validation';
import { MinDateToday } from 'src/common/request/validations/request.min-date-today.validation';

export class ApiKeyCreateDto {
    @ApiProperty({
        description: 'Api Key name',
        example: `testapiname`,
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    name: string;

    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @MinDateToday()
    startDate?: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @MinGreaterThanEqual('startDate')
    endDate?: Date;

    @ApiProperty({
        description: 'Description of api key',
        example: 'blabla description',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    description?: string;
}

export class ApiKeyCreateRawDto extends PartialType(ApiKeyCreateDto) {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    key: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    secret: string;
}
