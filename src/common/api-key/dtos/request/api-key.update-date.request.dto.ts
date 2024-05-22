import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';
import { DateGreaterThanEqual } from 'src/common/request/validations/request.date-greater-than.validation';
import { GreaterThanEqualOtherProperty } from 'src/common/request/validations/request.greater-than-other-property.validation';

export class ApiKeyUpdateDateRequestDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    @DateGreaterThanEqual(new Date())
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
        nullable: true,
    })
    @IsNotEmpty()
    @IsISO8601()
    @GreaterThanEqualOtherProperty('startDate')
    endDate: Date;
}
