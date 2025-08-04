import {
    FILE_MAX_MULTIPLE,
    FILE_SIZE_IN_BYTES,
} from '@common/file/constants/file.constant';
import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigMiddleware {
    body: {
        json: { limit: number };
        raw: { limit: number };
        text: { limit: number };
        urlencoded: { limit: number };
        applicationOctetStream: { limit: number };
    };
    timeout: number;
    cors: {
        allowMethod: string[];
        allowOrigin: string[];
        allowHeader: string[];
    };
    throttle: {
        ttl: number;
        limit: number;
    };
}

export default registerAs(
    'middleware',
    (): IConfigMiddleware => ({
        body: {
            json: {
                limit: bytes('500kb'),
            },
            raw: {
                limit: FILE_SIZE_IN_BYTES * FILE_MAX_MULTIPLE + bytes('500kb'),
            },
            text: {
                limit: bytes('1mb'),
            },
            urlencoded: {
                limit: bytes('1mb'),
            },
            applicationOctetStream: {
                limit: FILE_SIZE_IN_BYTES,
            },
        },
        timeout: ms('30s'), // 30s based on ms module
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
                'x-two-fa-token',
            ],
        },
        throttle: {
            ttl: ms('500'), // 0.5 secs
            limit: 10, // max request per reset time
        },
    })
);
