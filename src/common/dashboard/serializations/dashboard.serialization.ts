import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class DashboardSerialization {
    @ApiProperty({
        name: 'name',
        nullable: true,
    })
    name?: string;

    @ApiProperty({
        name: 'month',
        nullable: true,
    })
    month?: number;

    @ApiProperty({
        name: 'year',
        nullable: true,
    })
    year?: number;

    @ApiProperty({
        name: 'total',
        example: faker.random.numeric(4, { allowLeadingZeros: false }),
        description: 'Total user',
        nullable: false,
    })
    total: number;

    @ApiProperty({
        name: 'percent',
        description: 'Percent of target',
        required: true,
        nullable: false,
        example: 15.4,
    })
    percent: number;
}
