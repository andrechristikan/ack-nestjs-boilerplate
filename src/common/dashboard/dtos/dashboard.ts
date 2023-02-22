import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, ValidateIf } from 'class-validator';
import { MinGreaterThan } from 'src/common/request/validations/request.min-greater-than.validation';

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
    @MinGreaterThan('startDate')
    @Type(() => Date)
    @ValidateIf((e) => e.startDate !== '' || e.endDate !== '')
    endDate?: Date;
}
