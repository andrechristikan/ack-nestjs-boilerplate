import { z } from 'zod';
import { faker } from '@faker-js/faker';

const RequestUserAgentBrowserResponseSchema = z.object({
    name: z.string().nullable().meta({
        description: 'Browser name parsed from the user agent',
        example: 'Chrome',
    }),
    version: z.string().nullable().meta({
        description: 'Full browser version parsed from the user agent',
        example: '112.0.5615.49',
    }),
    major: z.string().nullable().meta({
        description: 'Major browser version parsed from the user agent',
        example: '112',
    }),
    type: z.string().nullable().meta({
        description: 'Browser type parsed from the user agent',
        example: 'mobile',
    }),
});

const RequestUserAgentCpuResponseSchema = z.object({
    architecture: z.string().nullable().meta({
        description: 'CPU architecture parsed from the user agent',
        example: 'amd64',
    }),
});

const RequestUserAgentDeviceResponseSchema = z.object({
    type: z.string().nullable().meta({
        description: 'Device type parsed from the user agent',
        example: 'mobile',
    }),
    vendor: z.string().nullable().meta({
        description: 'Device vendor parsed from the user agent',
        example: 'Apple',
    }),
    model: z.string().nullable().meta({
        description: 'Device model parsed from the user agent',
        example: 'iPhone',
    }),
});

const RequestUserAgentEngineResponseSchema = z.object({
    name: z.string().nullable().meta({
        description: 'Rendering engine name parsed from the user agent',
        example: 'WebKit',
    }),
    version: z.string().nullable().meta({
        description: 'Rendering engine version parsed from the user agent',
        example: '537.36',
    }),
});

const RequestUserAgentOsResponseSchema = z.object({
    name: z.string().nullable().meta({
        description: 'Operating system name parsed from the user agent',
        example: 'iOS',
    }),
    version: z.string().nullable().meta({
        description: 'Operating system version parsed from the user agent',
        example: '16.3.1',
    }),
});

/** Response shape representing parsed User-Agent information from the request header. */
export const RequestUserAgentResponseSchema = z.object({
    ua: z.string().nullable().meta({
        description: 'Raw user-agent string from the request',
        example: faker.internet.userAgent(),
    }),
    browser: RequestUserAgentBrowserResponseSchema.nullable().meta({
        description: 'Browser details parsed from the user agent',
        example: {
            name: 'Chrome',
            version: '112.0.5615.49',
            major: '112',
            type: 'mobile',
        },
    }),
    cpu: RequestUserAgentCpuResponseSchema.nullable().meta({
        description: 'CPU details parsed from the user agent',
        example: {
            architecture: 'amd64',
        },
    }),
    device: RequestUserAgentDeviceResponseSchema.nullable().meta({
        description: 'Device details parsed from the user agent',
        example: {
            type: 'mobile',
            vendor: 'Apple',
            model: 'iPhone',
        },
    }),
    engine: RequestUserAgentEngineResponseSchema.nullable().meta({
        description: 'Rendering engine details parsed from the user agent',
        example: {
            name: 'WebKit',
            version: '537.36',
        },
    }),
    os: RequestUserAgentOsResponseSchema.nullable().meta({
        description: 'Operating system details parsed from the user agent',
        example: {
            name: 'iOS',
            version: '16.3.1',
        },
    }),
});

export type RequestUserAgentResponseDto = z.infer<
    typeof RequestUserAgentResponseSchema
>;
