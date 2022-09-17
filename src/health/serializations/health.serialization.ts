import { ApiProperty } from '@nestjs/swagger';

export class HealthSerialization {
    @ApiProperty({
        example: 'ok',
    })
    status: string;

    @ApiProperty({
        example: {
            awsBucket: {
                status: 'up',
            },
        },
    })
    info: Record<string, any>;

    @ApiProperty({
        example: {},
    })
    error: Record<string, any>;

    @ApiProperty({
        example: {
            awsBucket: {
                status: 'up',
            },
        },
    })
    details: Record<string, any>;
}
