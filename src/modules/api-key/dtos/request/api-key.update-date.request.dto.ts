import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';
import { GreaterThanEqualOtherProperty } from '@common/request/validations/request.greater-than-other-property.validation';
import { IsAfterNow } from '@common/request/validations/request.is-after-now.validation';

export class ApiKeyUpdateDateRequestDto {
    @ApiProperty({
        description: 'Api Key start date',
        example: faker.date.recent(),
        required: false,
    })
    @IsNotEmpty()
    @IsISO8601()
    @IsAfterNow()
    startDate: Date;

    @ApiProperty({
        description: 'Api Key end date',
        example: faker.date.recent(),
        required: false,
    })
    @IsNotEmpty()
    @IsISO8601()
    @GreaterThanEqualOtherProperty('startDate')
    endDate: Date;
}
