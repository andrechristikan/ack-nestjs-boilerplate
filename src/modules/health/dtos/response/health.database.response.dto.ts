import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthDatabaseResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
        description:
            'Overall health status of the checked database indicators',
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        description: 'Database indicators that reported up',
        example: {
            database: {
                status: 'up',
            },
            redis: {
                status: 'up',
            },
            queue: {
                status: 'up',
            },
        },
    })
    info?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        description: 'Database indicators that reported down',
        example: {
            database: {
                status: 'down',
            },
            redis: {
                status: 'down',
            },
            queue: {
                status: 'down',
            },
        },
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        description: 'Combined database indicator results for this check',
        example: {
            database: {
                status: 'up',
            },
            redis: {
                status: 'up',
            },
            queue: {
                status: 'up',
            },
        },
    })
    details: HealthIndicatorResult;
}
