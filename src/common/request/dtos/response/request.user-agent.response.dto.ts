import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class RequestUserAgentBrowserResponseDto {
    @ApiProperty({
        required: false,
        example: 'Chrome',
        description: 'Browser name parsed from the user agent',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '112.0.5615.49',
        description: 'Full browser version parsed from the user agent',
    })
    @Expose()
    version?: string;

    @ApiProperty({
        required: false,
        example: '112',
        description: 'Major browser version parsed from the user agent',
    })
    @Expose()
    major?: string;

    @ApiProperty({
        required: false,
        example: 'mobile',
        description: 'Browser type parsed from the user agent',
    })
    @Expose()
    type?: string;
}

class RequestUserAgentCpuResponseDto {
    @ApiProperty({
        required: false,
        example: 'amd64',
        description: 'CPU architecture parsed from the user agent',
    })
    @Expose()
    architecture?: string;
}

class RequestUserAgentDeviceResponseDto {
    @ApiProperty({
        required: false,
        example: 'mobile',
        description: 'Device type parsed from the user agent',
    })
    @Expose()
    type?: string;

    @ApiProperty({
        required: false,
        example: 'Apple',
        description: 'Device vendor parsed from the user agent',
    })
    @Expose()
    vendor?: string;

    @ApiProperty({
        required: false,
        example: 'iPhone',
        description: 'Device model parsed from the user agent',
    })
    @Expose()
    model?: string;
}

class RequestUserAgentEngineResponseDto {
    @ApiProperty({
        required: false,
        example: 'WebKit',
        description: 'Rendering engine name parsed from the user agent',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '537.36',
        description: 'Rendering engine version parsed from the user agent',
    })
    @Expose()
    version?: string;
}

class RequestUserAgentOsResponseDto {
    @ApiProperty({
        required: false,
        example: 'iOS',
        description: 'Operating system name parsed from the user agent',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '16.3.1',
        description: 'Operating system version parsed from the user agent',
    })
    @Expose()
    version?: string;
}

/** Response DTO representing parsed User-Agent information from the request header. */
export class RequestUserAgentResponseDto {
    @ApiProperty({
        required: false,
        example: faker.internet.userAgent(),
        description: 'Raw user-agent string from the request',
    })
    @Expose()
    ua: string;

    @ApiProperty({
        required: false,
        type: RequestUserAgentBrowserResponseDto,
        description: 'Browser details parsed from the user agent',
        example: {
            name: 'Chrome',
            version: '112.0.5615.49',
            major: '112',
            type: 'mobile',
        },
    })
    @Expose()
    @Type(() => RequestUserAgentBrowserResponseDto)
    browser?: RequestUserAgentBrowserResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentCpuResponseDto,
        description: 'CPU details parsed from the user agent',
        example: {
            architecture: 'amd64',
        },
    })
    @Expose()
    @Type(() => RequestUserAgentCpuResponseDto)
    cpu?: RequestUserAgentCpuResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentDeviceResponseDto,
        description: 'Device details parsed from the user agent',
        example: {
            type: 'mobile',
            vendor: 'Apple',
            model: 'iPhone',
        },
    })
    @Expose()
    @Type(() => RequestUserAgentDeviceResponseDto)
    device?: RequestUserAgentDeviceResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentEngineResponseDto,
        description: 'Rendering engine details parsed from the user agent',
        example: {
            name: 'WebKit',
            version: '537.36',
        },
    })
    @Expose()
    @Type(() => RequestUserAgentEngineResponseDto)
    engine?: RequestUserAgentEngineResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentOsResponseDto,
        description: 'Operating system details parsed from the user agent',
        example: {
            name: 'iOS',
            version: '16.3.1',
        },
    })
    @Expose()
    @Type(() => RequestUserAgentOsResponseDto)
    os?: RequestUserAgentOsResponseDto;
}
