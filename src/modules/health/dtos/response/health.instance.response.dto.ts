import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthInstanceResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        example: {
            memoryRss: {
                status: 'up',
            },
            memoryHeap: {
                status: 'up',
            },
            storage: {
                status: 'up',
            },
        },
    })
    info?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        example: {
            memoryRss: {
                status: 'down',
            },
            memoryHeap: {
                status: 'down',
            },
            storage: {
                status: 'down',
            },
        },
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        example: {
            memoryRss: {
                status: 'up',
            },
            memoryHeap: {
                status: 'up',
            },
            storage: {
                status: 'up',
            },
        },
    })
    details: HealthIndicatorResult;
}
