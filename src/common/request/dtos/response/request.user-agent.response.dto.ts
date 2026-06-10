import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class RequestUserAgentBrowserResponseDto {
    @ApiProperty({
        required: false,
        example: 'Chrome',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '112.0.5615.49',
    })
    @Expose()
    version?: string;

    @ApiProperty({
        required: false,
        example: '112',
    })
    @Expose()
    major?: string;

    @ApiProperty({
        required: false,
        example: 'mobile',
    })
    @Expose()
    type?: string;
}

class RequestUserAgentCpuResponseDto {
    @ApiProperty({
        required: false,
        example: 'amd64',
    })
    @Expose()
    architecture?: string;
}

class RequestUserAgentDeviceResponseDto {
    @ApiProperty({
        required: false,
        example: 'mobile',
    })
    @Expose()
    type?: string;

    @ApiProperty({
        required: false,
        example: 'Apple',
    })
    @Expose()
    vendor?: string;

    @ApiProperty({
        required: false,
        example: 'iPhone',
    })
    @Expose()
    model?: string;
}

class RequestUserAgentEngineResponseDto {
    @ApiProperty({
        required: false,
        example: 'WebKit',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '537.36',
    })
    @Expose()
    version?: string;
}

class RequestUserAgentOsResponseDto {
    @ApiProperty({
        required: false,
        example: 'iOS',
    })
    @Expose()
    name?: string;

    @ApiProperty({
        required: false,
        example: '16.3.1',
    })
    @Expose()
    version?: string;
}

/** Response DTO representing parsed User-Agent information from the request header. */
export class RequestUserAgentResponseDto {
    @ApiProperty({
        required: false,
    })
    @Expose()
    ua: string;

    @ApiProperty({
        required: false,
        type: RequestUserAgentBrowserResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentBrowserResponseDto)
    browser?: RequestUserAgentBrowserResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentCpuResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentCpuResponseDto)
    cpu?: RequestUserAgentCpuResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentDeviceResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentDeviceResponseDto)
    device?: RequestUserAgentDeviceResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentEngineResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentEngineResponseDto)
    engine?: RequestUserAgentEngineResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentOsResponseDto,
    })
    @Expose()
    @Type(() => RequestUserAgentOsResponseDto)
    os?: RequestUserAgentOsResponseDto;
}
