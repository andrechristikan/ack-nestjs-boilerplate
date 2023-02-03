import { Type } from 'class-transformer';
import { IsDate, IsOptional, ValidateIf } from 'class-validator';
import { MinGreaterThan } from 'src/common/request/validations/request.min-greater-than.validation';

export class DashboardDto {
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    startDate?: Date;

    @IsDate()
    @IsOptional()
    @MinGreaterThan('startDate')
    @Type(() => Date)
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    endDate?: Date;
}
