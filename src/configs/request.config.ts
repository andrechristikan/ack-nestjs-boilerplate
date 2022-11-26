import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';

export default registerAs(
    'request',
    (): Record<string, any> => ({
        body: {
            json: {
                maxFileSize: bytes('100kb'), // 100kb
            },
            raw: {
                maxFileSize: bytes('5mb'), // 5mb
            },
            text: {
                maxFileSize: bytes('100kb'), // 100kb
            },
            urlencoded: {
                maxFileSize: bytes('100kb'), // 100kb
            },
        },
        timestamp: {
            toleranceTimeInMs: ms(
                process.env.MIDDLEWARE_TIMESTAMP_TOLERANCE || '5m'
            ), // 5 mins
        },
        timeout: ms('30s'), // 30s based on ms module
        userAgent: {
            os: [
                'Mobile',
                'Mac OS',
                'Windows',
                'UNIX',
                'Linux',
                'iOS',
                'Android',
            ],
            browser: [
                'IE',
                'Safari',
                'Edge',
                'Opera',
                'Chrome',
                'Firefox',
                'Samsung Browser',
                'UCBrowser',
            ],
        },
        cors: {
            allowMethod: [
                ENUM_REQUEST_METHOD.GET,
                ENUM_REQUEST_METHOD.DELETE,
                ENUM_REQUEST_METHOD.PUT,
                ENUM_REQUEST_METHOD.PATCH,
                ENUM_REQUEST_METHOD.POST,
            ],
            allowOrigin: '*', // allow all origin
            // allowOrigin: [/example\.com(\:\d{1,4})?$/], // allow all subdomain, and all port
            // allowOrigin: [/example\.com$/], // allow all subdomain without port
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
        rateLimit: {
            resetTime: ms(500), // 0.5 secs
            maxRequestPerId: 1, // max request per reset time
        },
    })
);
