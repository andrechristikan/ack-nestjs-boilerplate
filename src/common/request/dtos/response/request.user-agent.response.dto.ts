import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RequestUserAgentBrowserResponseDto {
    @ApiProperty({
        required: false,
        example: 'Chrome',
    })
    name?: string;

    @ApiProperty({
        required: false,
        example: '112.0.5615.49',
    })
    version?: string;

    @ApiProperty({
        required: false,
        example: '112',
    })
    major?: string;

    @ApiProperty({
        required: false,
        example: 'mobile',
    })
    type?: string;
}

class RequestUserAgentCpuResponseDto {
    @ApiProperty({
        required: false,
        example: 'amd64',
    })
    architecture?: string;
}

class RequestUserAgentDeviceResponseDto {
    @ApiProperty({
        required: false,
        example: 'mobile',
    })
    type?: string;

    @ApiProperty({
        required: false,
        example: 'Apple',
    })
    vendor?: string;

    @ApiProperty({
        required: false,
        example: 'iPhone',
    })
    model?: string;
}

class RequestUserAgentEngineResponseDto {
    @ApiProperty({
        required: false,
        example: 'WebKit',
    })
    name?: string;

    @ApiProperty({
        required: false,
        example: '537.36',
    })
    version?: string;
}

class RequestUserAgentOsResponseDto {
    @ApiProperty({
        required: false,
        example: 'iOS',
    })
    name?: string;

    @ApiProperty({
        required: false,
        example: '16.3.1',
    })
    version?: string;
}

export class RequestUserAgentResponseDto {
    @ApiProperty({
        required: false,
    })
    ua: string;

    @ApiProperty({
        required: false,
        type: RequestUserAgentBrowserResponseDto,
    })
    @Type(() => RequestUserAgentBrowserResponseDto)
    browser?: RequestUserAgentBrowserResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentCpuResponseDto,
    })
    @Type(() => RequestUserAgentCpuResponseDto)
    cpu?: RequestUserAgentCpuResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentDeviceResponseDto,
    })
    @Type(() => RequestUserAgentDeviceResponseDto)
    device?: RequestUserAgentDeviceResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentEngineResponseDto,
    })
    @Type(() => RequestUserAgentEngineResponseDto)
    engine?: RequestUserAgentEngineResponseDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentOsResponseDto,
    })
    @Type(() => RequestUserAgentOsResponseDto)
    os?: RequestUserAgentOsResponseDto;
}
