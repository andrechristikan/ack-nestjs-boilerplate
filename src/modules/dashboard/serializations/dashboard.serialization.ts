import { ApiProperty } from '@nestjs/swagger';

export class DashboardSerialization {
    @ApiProperty({
        name: 'startDate',
        required: true,
    })
    startDate: Date;

    @ApiProperty({
        name: 'endDate',
        required: true,
    })
    endDate: Date;
}

export class DashboardTotalSerialization {
    @ApiProperty({
        name: 'total',
        required: true,
    })
    total: number;

    @ApiProperty({
        name: 'percent',
        required: false,
    })
    percent?: number;
}

export class DashboardTotalByMonthSerialization extends DashboardTotalSerialization {
    @ApiProperty({
        name: 'month',
        required: true,
    })
    month: number;

    @ApiProperty({
        name: 'year',
        required: true,
    })
    year: number;
}
