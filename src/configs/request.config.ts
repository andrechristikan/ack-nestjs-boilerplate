import { FileSizeInBytes } from '@common/file/constants/file.constant';
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
            text: {
                limitInBytes: bytes('1mb'),
            },
            urlencoded: {
                limitInBytes: bytes('1mb'),
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
            allowedOrigin: process.env.CORS_ALLOWED_ORIGIN?.split(',') ?? [],
            allowedHeader: [
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
                'x-correlation-id',
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
