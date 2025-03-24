import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { StreamingBlobTypes } from '@smithy/types';
import { Exclude, Transform, Type } from 'class-transformer';
import { Types } from 'mongoose';

export class AwsS3Dto {
    @ApiProperty({
        required: true,
    })
    bucket: string;

    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
    })
    key: string;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    cdnUrl?: string;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    completedUrl: string;

    @ApiProperty({
        required: true,
    })
    mime: string;

    @ApiProperty({
        required: true,
    })
    extension: string;

    @ApiProperty({
        required: false,
    })
    duration?: number;

    @Exclude()
    @ApiHideProperty()
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => string;
        transformToByteArray?: () => Buffer;
        transformToWebStream?: () => ReadableStream<Buffer>;
    };

    @ApiProperty({
        required: true,
    })
    @Type(() => String)
    @Transform(({ value }) => Number.parseInt(value))
    size: number;
}
