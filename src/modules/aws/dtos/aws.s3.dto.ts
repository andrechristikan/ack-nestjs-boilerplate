import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { StreamingBlobTypes } from '@smithy/types';

export class AwsS3Dto {
    @ApiProperty({
        required: true,
    })
    bucket: string;

    @ApiProperty({
        required: true,
    })
    key: string;

    @ApiProperty({
        required: true,
        example: faker.system.directoryPath(),
    })
    path: string;

    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
    })
    pathWithFilename: string;

    @ApiProperty({
        required: true,
        example: faker.system.fileName(),
    })
    filename: string;

    @ApiProperty({
        required: true,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    completedUrl: string;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    cdnUrl?: string;

    @ApiProperty({
        required: true,
        example: faker.internet.url(),
    })
    baseUrl: string;

    @ApiProperty({
        required: true,
        example: faker.system.mimeType(),
    })
    mime: string;

    @ApiProperty({
        required: false,
    })
    duration?: number;

    @ApiProperty({
        required: false,
    })
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => string;
        transformToByteArray?: () => Buffer;
        transformToWebStream?: () => ReadableStream<Buffer>;
    };

    @ApiProperty({
        required: true,
    })
    size: string;
}
