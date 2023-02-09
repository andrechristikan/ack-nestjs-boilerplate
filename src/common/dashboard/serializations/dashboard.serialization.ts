import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class DashboardSerialization {
    @ApiProperty({
        name: 'total',
        example: faker.random.numeric(4, { allowLeadingZeros: false }),
        description: 'Total user',
        nullable: false,
    })
    total: number;
}
