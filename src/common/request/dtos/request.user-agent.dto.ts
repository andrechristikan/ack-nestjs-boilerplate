import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RequestUserAgentBrowserDto {
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

class RequestUserAgentCpuDto {
    @ApiProperty({
        required: false,
        example: 'amd64',
    })
    architecture?: string;
}

class RequestUserAgentDeviceDto {
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

class RequestUserAgentEngineDto {
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

class RequestUserAgentOsDto {
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

export class RequestUserAgentDto {
    @ApiProperty({
        required: false,
    })
    ua: string;

    @ApiProperty({
        required: false,
        type: RequestUserAgentBrowserDto,
    })
    @Type(() => RequestUserAgentBrowserDto)
    browser?: RequestUserAgentBrowserDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentCpuDto,
    })
    @Type(() => RequestUserAgentCpuDto)
    cpu?: RequestUserAgentCpuDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentDeviceDto,
    })
    @Type(() => RequestUserAgentDeviceDto)
    device?: RequestUserAgentDeviceDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentEngineDto,
    })
    @Type(() => RequestUserAgentEngineDto)
    engine?: RequestUserAgentEngineDto;

    @ApiProperty({
        required: false,
        type: RequestUserAgentOsDto,
    })
    @Type(() => RequestUserAgentOsDto)
    os?: RequestUserAgentOsDto;
}
