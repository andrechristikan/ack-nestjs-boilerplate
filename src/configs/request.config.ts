import {
    FILE_MAX_MULTIPLE,
    FILE_SIZE_IN_BYTES,
} from '@common/file/constants/file.constant';
import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigRequest {
    body: {
        json: { limitInBytes: number };
        raw: { limitInBytes: number };
        text: { limitInBytes: number };
        urlencoded: { limitInBytes: number };
        applicationOctetStream: { limitInBytes: number };
    };
    timeoutInMs: number;
    cors: {
        allowMethod: string[];
        allowOrigin: string[];
        allowHeader: string[];
    };
    throttle: {
        ttlInMs: number;
        limit: number;
    };
}

export default registerAs(
    'request',
    (): IConfigRequest => ({
        body: {
            json: {
                limitInBytes: bytes('500kb'),
            },
            raw: {
                limitInBytes:
                    FILE_SIZE_IN_BYTES * FILE_MAX_MULTIPLE + bytes('500kb'),
            },
            text: {
                limitInBytes: bytes('1mb'),
            },
            urlencoded: {
                limitInBytes: bytes('1mb'),
            },
            applicationOctetStream: {
                limitInBytes: FILE_SIZE_IN_BYTES,
            },
        },
        timeoutInMs: ms('30s'),
        cors: {
            allowMethod: [
                'GET',
                'DELETE',
                'PUT',
                'PATCH',
                'POST',
                'HEAD',
                'OPTIONS',
            ],
            allowOrigin: process.env.MIDDLEWARE_CORS_ORIGIN?.split(',') ?? [],
            allowHeader: [
                'Accept',
                'Accept-Language',
                'Content-Language',
                'Content-Type',
                'Origin',
                'Authorization',
                'Access-Control-Request-Method',
                'Access-Control-Request-Headers',
                'Access-Control-Allow-Headers',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Credentials',
                'Access-Control-Expose-Headers',
                'Access-Control-Max-Age',
                'Referer',
                'Host',
                'X-Requested-With',
                'x-custom-lang',
                'x-timestamp',
                'x-api-key',
                'x-timezone',
                'x-request-id',
                'x-version',
                'x-repo-version',
                'X-Response-Time',
                'user-agent',
            ],
        },
        throttle: {
            ttlInMs: ms('500'),
            limit: 10,
        },
    })
);
