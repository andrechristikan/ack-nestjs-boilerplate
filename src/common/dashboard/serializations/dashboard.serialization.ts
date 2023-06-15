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
        required: true,
        nullable: false,
        name: 'total',
        example: faker.number.int({ min: 1000, max: 9999 }),
        description: 'Total user',
    })
    total: number;

    @ApiProperty({
        name: 'percent',
        description: 'Percent of target',
        required: true,
        nullable: false,
        example: faker.number.float({ max: 100 }),
    })
    percent: number;
}
