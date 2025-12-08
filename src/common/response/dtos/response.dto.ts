import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Response metadata DTO containing API request information.
 * Provides contextual data about the API response including language, timing, and versioning.
 */
export class ResponseMetadataDto {
    @ApiProperty({
        required: true,
        description: 'Language of the response message',
        example: ENUM_MESSAGE_LANGUAGE.en,
        type: String,
    })
    language: ENUM_MESSAGE_LANGUAGE;

    @ApiProperty({
        required: true,
        description: 'Timestamp of the response',
        example: 1660190937231,
        type: Number,
    })
    timestamp: number;

    @ApiProperty({
        required: true,
        description: 'Timezone of the response',
        example: 'Asia/Jakarta',
        type: String,
    })
    timezone: string;

    @ApiProperty({
        required: true,
        description: 'API path of the request',
        example: '/api/v1/test/hello',
        type: String,
    })
    path: string;

    @ApiProperty({
        required: true,
        description: 'Version of the API',
        example: '1',
        type: String,
    })
    version: string;

    @ApiProperty({
        required: true,
        description: 'Repository version of the application',
        example: '1.0.0',
        type: String,
    })
    repoVersion: string;

    [key: string]:
        | string
        | number
        | string[]
        | number[]
        | boolean
        | boolean[]
        | Record<
              string,
              | string
              | number
              | boolean
              | Array<string | number | boolean>
              | Date
          >;
}

/**
 * Generic response DTO wrapper for API responses.
 * Provides standardized structure for all API responses with metadata and status information.
 *
 * @template T - Type of the response data
 */
export class ResponseDto<T> {
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
        name: 'metadata',
        required: true,
        description: 'Contain metadata about API',
        type: ResponseMetadataDto,
        additionalProperties: true,
        example: {
            language: 'en',
            timestamp: 1660190937231,
            timezone: 'Asia/Jakarta',
            path: '/api/v1/test/hello',
            version: '1',
            repoVersion: '1.0.0',
        },
    })
    @Type(() => ResponseMetadataDto)
    metadata: ResponseMetadataDto;

    @ApiHideProperty()
    data?: T;
}
