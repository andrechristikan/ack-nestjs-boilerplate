import { faker } from '@faker-js/faker';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@modules/aws/enums/aws.enum';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { StreamingBlobTypes } from '@smithy/types';
import { Exclude } from 'class-transformer';

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
        example: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        enum: ENUM_AWS_S3_ACCESSIBILITY,
    })
    access: ENUM_AWS_S3_ACCESSIBILITY;

    @Exclude()
    @ApiHideProperty()
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => Promise<string>;
        transformToByteArray?: () => Promise<Buffer>;
        transformToWebStream?: () => Promise<ReadableStream<Buffer>>;
    };

    @ApiProperty({
        required: true,
    })
    size: number;
}
