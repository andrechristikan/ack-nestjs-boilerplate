import { ApiProperty, OmitType } from '@nestjs/swagger';

export class DashboardMonthAndYearSerialization {
    @ApiProperty({
        name: 'total',
        example: 12,
    })
    month: number;

    @ApiProperty({
        name: 'total',
        example: 2001,
    })
    year: number;

    @ApiProperty({
        name: 'total',
        description: 'total of target',
        required: true,
        nullable: false,
        example: 0,
    })
    total: number;
}

export class DashboardMonthAndYearPercentageSerialization extends OmitType(
    DashboardMonthAndYearSerialization,
    ['total'] as const
) {
    @ApiProperty({
        name: 'percent',
        description: 'Percent of target',
        required: true,
        nullable: false,
        example: 15.4,
    })
    percent: number;
}
