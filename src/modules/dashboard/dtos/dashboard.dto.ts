import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, ValidateIf } from 'class-validator';
import { GreaterThanEqual } from 'src/common/request/validations/request.greater-than-equal.validation';

export class DashboardDto {
    @ApiProperty({
        name: 'startDate',
        required: false,
        nullable: true,
    })
    @IsDateString()
    @IsOptional()
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    startDate?: Date;

    @ApiProperty({
        name: 'endDate',
        required: false,
        nullable: true,
    })
    @IsDateString()
    @IsOptional()
    @GreaterThanEqual('startDate')
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    endDate?: Date;
}
