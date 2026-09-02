import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthAwsResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
        description: 'Overall health status of the checked AWS indicators',
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        description: 'AWS indicators that reported up',
        example: {
            s3PublicBucket: {
                status: 'up',
            },
            s3PrivateBucket: {
                status: 'up',
            },
            ses: {
                status: 'up',
            },
        },
    })
    info?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        description: 'AWS indicators that reported down',
        example: {
            s3PublicBucket: {
                status: 'down',
            },
            s3PrivateBucket: {
                status: 'down',
            },
            ses: {
                status: 'down',
            },
        },
    })
    error?: HealthIndicatorResult;

    @ApiProperty({
        required: true,
        description: 'Combined AWS indicator results for this check',
        example: {
            s3PublicBucket: {
                status: 'up',
            },
            s3PrivateBucket: {
                status: 'up',
            },
            ses: {
                status: 'up',
            },
        },
    })
    details: HealthIndicatorResult;
}
