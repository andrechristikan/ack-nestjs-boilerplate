import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class ResponseMetadataDto {
    language: string;
    timestamp: number;
    timezone: string;
    path: string;
    version: string;
    repoVersion: string;
    [key: string]: any;
}

export class ResponseDto {
    @ApiProperty({
        name: 'statusCode',
        type: 'number',
        required: true,
        description: 'return specific status code for every endpoints',
        example: 200,
    })
    statusCode: number;

    @ApiProperty({
        name: 'message',
        required: true,
        description: 'Message base on language',
        type: 'string',
        example: 'message endpoint',
    })
    message: string;

    @ApiProperty({
        name: '_metadata',
        required: true,
        description: 'Contain metadata about API',
        type: ResponseMetadataDto,
        example: {
            language: 'en',
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
        },
    })
    _metadata: ResponseMetadataDto;

    @ApiHideProperty()
    data?: Record<string, any>;
}
