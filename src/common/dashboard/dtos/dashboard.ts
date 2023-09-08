import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, ValidateIf } from 'class-validator';
import { GreaterThanEqual } from 'src/common/request/validations/request.greater-than-equal.validation';

export class DashboardDto {
    @ApiProperty({
        name: 'startDate',
        required: false,
        nullable: true,
    })
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    startDate?: Date;

    @ApiProperty({
        name: 'endDate',
        required: false,
        nullable: true,
    })
    @IsDate()
    @IsOptional()
    @GreaterThanEqual('startDate')
    @Type(() => Date)
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    endDate?: Date;
}
