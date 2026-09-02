import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthInstanceResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
        description:
            'Overall health status of the checked instance indicators',
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        description: 'Instance indicators that reported up',
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
        description: 'Instance indicators that reported down',
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
        description: 'Combined instance indicator results for this check',
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
