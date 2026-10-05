import { FileSizeInBytes } from '@common/file/constants/file.constant';
import {
    RequestCorrelationIdHeaderName,
    RequestCustomLangHeaderName,
    RequestIdHeaderName,
    RequestWorkspaceIdHeaderName,
} from '@common/request/constants/request.constant';
import {
    EnumRequestThrottleName,
    EnumRequestThrottleRoute,
} from '@common/request/enums/request.enum';
import {
    ResponseRepoVersionHeaderName,
    ResponseTimestampHeaderName,
    ResponseTimezoneHeaderName,
    ResponseVersionHeaderName,
} from '@common/response/constants/response.constant';
import { ApiKeyHeaderName } from '@modules/api-key/constants/api-key.constant';
import { AuthHeaderName } from '@modules/auth/constants/auth.constant';
import { FeatureFlagAnonymousIdHeaderName } from '@modules/feature-flag/constants/feature-flag.constant';
import type { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
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
    helmet: {
        maxAgeInSeconds: number;
        includeSubDomains: boolean;
        preload: boolean;
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

export default registerAs('request', (): IConfigRequest => {
    const throttleHeaderPrefix = 'X-RateLimit';
    const throttleHeaderSuffixes = [
        '',
        `-${EnumRequestThrottleName.route}`,
        `-${EnumRequestThrottleName.user}`,
    ];

    return {
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
                AuthHeaderName,
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers',
                'Referer',
                'Host',
                'X-Requested-With',
                RequestCustomLangHeaderName,
                ResponseTimestampHeaderName,
                ApiKeyHeaderName,
                ResponseTimezoneHeaderName,
                RequestWorkspaceIdHeaderName,
                FeatureFlagAnonymousIdHeaderName,
                RequestIdHeaderName,
                RequestCorrelationIdHeaderName,
                ResponseVersionHeaderName,
                ResponseRepoVersionHeaderName,
                'X-Response-Time',
                'user-agent',
            ],
            exposedHeader: [
                'Retry-After',
                ...throttleHeaderSuffixes.flatMap(suffix =>
                    ['Limit', 'Remaining', 'Reset'].map(
                        name => `${throttleHeaderPrefix}-${name}${suffix}`
                    )
                ),
                RequestCustomLangHeaderName,
                ResponseTimestampHeaderName,
                ResponseTimezoneHeaderName,
                ResponseVersionHeaderName,
                ResponseRepoVersionHeaderName,
                RequestIdHeaderName,
                RequestCorrelationIdHeaderName,
            ],
        },
        helmet: {
            maxAgeInSeconds: ms('365d') / 1000,
            includeSubDomains: true,
            preload: false,
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
            headerPrefix: throttleHeaderPrefix,
            keyPattern: 'Request:Throttle:{name}:{tracker}',
            blockKeyPattern: 'Request:Throttle:Block:{name}:{tracker}',
            sequenceKeyPattern: 'Request:Throttle:Seq:{name}:{tracker}',
        },
    };
});
