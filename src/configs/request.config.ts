import { FileSizeInBytes } from '@common/file/constants/file.constant';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigRequest {
    body: {
        json: { limitInBytes: number };
        text: { limitInBytes: number };
        urlencoded: { limitInBytes: number };
        applicationOctetStream: { limitInBytes: number };
    };
    timeoutInMs: number;
    cors: {
        allowedMethod: string[];
        allowedOrigin: string[];
        allowedHeader: string[];
        exposedHeader: string[];
    };
    throttle: {
        default: IRequestThrottlePolicy;
        user: IRequestThrottlePolicy;
        route: Record<EnumRequestThrottleRoute, IRequestThrottlePolicy>;
        headerPrefix: string;
        keyPattern: string;
        blockKeyPattern: string;
        sequenceKeyPattern: string;
    };
}

export default registerAs('request', (): IConfigRequest => ({
    body: {
        json: {
            limitInBytes: bytes('500kb') ?? 512000,
        },
        text: {
            limitInBytes: bytes('1mb') ?? 1048576,
        },
        urlencoded: {
            limitInBytes: bytes('1mb') ?? 1048576,
        },
        applicationOctetStream: {
            limitInBytes: FileSizeInBytes,
        },
    },
    timeoutInMs: ms('30s'),
    cors: {
        allowedMethod: [
            'GET',
            'DELETE',
            'PUT',
            'PATCH',
            'POST',
            'HEAD',
            'OPTIONS',
        ],
        allowedOrigin: process.env.CORS_ALLOWED_ORIGIN!.split(','),
        allowedHeader: [
            'Accept',
            'Accept-Language',
            'Content-Language',
            'Content-Type',
            'Origin',
            'Authorization',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
            'Referer',
            'Host',
            'X-Requested-With',
            'x-custom-lang',
            'x-timestamp',
            'x-api-key',
            'x-timezone',
            'x-workspace-id',
            'x-anonymous-id',
            'x-request-id',
            'x-correlation-id',
            'x-version',
            'x-repo-version',
            'X-Response-Time',
            'user-agent',
        ],
        exposedHeader: [
            'Retry-After',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
            'X-RateLimit-Limit-route',
            'X-RateLimit-Remaining-route',
            'X-RateLimit-Reset-route',
            'X-RateLimit-Limit-user',
            'X-RateLimit-Remaining-user',
            'X-RateLimit-Reset-user',
        ],
    },
    throttle: {
        default: {
            ttlInMs: ms('1m'),
            limit: 300,
            blockDurationInMs: ms('1m'),
        },
        user: {
            ttlInMs: ms('1m'),
            limit: 100,
            blockDurationInMs: ms('1m'),
        },
        route: {
            [EnumRequestThrottleRoute.strict]: {
                ttlInMs: ms('1m'),
                limit: 5,
                blockDurationInMs: ms('5m'),
            },
            [EnumRequestThrottleRoute.moderate]: {
                ttlInMs: ms('1m'),
                limit: 20,
                blockDurationInMs: ms('5m'),
            },
            [EnumRequestThrottleRoute.relaxed]: {
                ttlInMs: ms('1m'),
                limit: 60,
                blockDurationInMs: ms('5m'),
            },
        },
        headerPrefix: 'X-RateLimit',
        keyPattern: 'Request:Throttler:{name}:{tracker}',
        blockKeyPattern: 'Request:Throttler:Block:{name}:{tracker}',
        sequenceKeyPattern: 'Request:Throttler:Seq:{name}:{tracker}',
    },
}));
