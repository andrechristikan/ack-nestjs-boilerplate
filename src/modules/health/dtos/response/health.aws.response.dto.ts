import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckStatus, HealthIndicatorResult } from '@nestjs/terminus';

export class HealthAwsResponseDto {
    @ApiProperty({
        required: true,
        examples: ['error', 'ok', 'shutting_down'],
    })
    status: HealthCheckStatus;

    @ApiProperty({
        required: true,
        example: {
            awsPublicBucket: {
                status: 'up',
            },
            awsPrivateBucket: {
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
        example: {
            awsPublicBucket: {
                status: 'down',
            },
            awsPrivateBucket: {
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
        example: {
            awsPublicBucket: {
                status: 'up',
            },
            awsPrivateBucket: {
                status: 'up',
            },
            ses: {
                status: 'up',
            },
        },
    })
    details: HealthIndicatorResult;
}
