import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, ValidateIf } from 'class-validator';
import { GreaterThanEqual } from 'src/common/request/validations/request.greater-than-equal.validation';

export class DashboardDto {
    @ApiProperty({
        name: 'startDate',
        required: false,
        nullable: true,
    })
    @IsISO8601()
    @IsOptional()
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    startDate?: Date;

    @ApiProperty({
        name: 'endDate',
        required: false,
        nullable: true,
    })
    @IsISO8601()
    @IsOptional()
    @GreaterThanEqual('startDate')
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    endDate?: Date;
}
