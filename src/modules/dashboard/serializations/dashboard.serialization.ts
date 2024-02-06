import { ApiProperty } from '@nestjs/swagger';

export class DashboardSerialization {
    @ApiProperty({
        name: 'name',
        nullable: true,
    })
    startDate: Date;

    @ApiProperty({
        name: 'month',
        nullable: true,
    })
    endDate: Date;
}
