import { faker } from '@faker-js/faker';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@common/aws/enums/aws.enum';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { StreamingBlobTypes } from '@smithy/types';
import { Exclude } from 'class-transformer';

/**
 * DTO for AWS S3 object information.
 * Data transfer object containing comprehensive information about an S3 object including metadata, URLs, and accessibility settings.
 */
export class AwsS3Dto {
    /**
     * S3 bucket name
     * @description The name of the AWS S3 bucket where the object is stored
     */
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'S3 bucket name',
    })
    bucket: string;

    /**
     * S3 object key/path
     * @description The unique identifier/path for the object within the S3 bucket
     */
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
        description: 'S3 object key/path',
    })
    key: string;

    /**
     * CDN URL for the object
     * @description Optional CDN (Content Delivery Network) URL for faster content delivery
     */
    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
        description: 'CDN URL for the object',
    })
    cdnUrl?: string;

    /**
     * Complete URL to access the object
     * @description Full URL that can be used to directly access the S3 object
     */
    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
        description: 'Complete URL to access the object',
    })
    completedUrl: string;

    /**
     * MIME type of the object
     * @description The media type/MIME type of the stored object (e.g., image/jpeg, application/pdf)
     */
    @ApiProperty({
        required: true,
        example: 'image/jpeg',
        description: 'MIME type of the object',
    })
    mime: string;

    /**
     * File extension
     * @description The file extension of the stored object (e.g., jpg, pdf, txt)
     */
    @ApiProperty({
        required: true,
        example: 'jpg',
        description: 'File extension',
    })
    extension: string;

    /**
     * Access level for the S3 object
     * @description Defines the accessibility level of the object (public, private, etc.)
     */
    @ApiProperty({
        required: false,
        example: ENUM_AWS_S3_ACCESSIBILITY.public,
        enum: ENUM_AWS_S3_ACCESSIBILITY,
        description: 'Access level for the S3 object',
        type: 'string',
    })
    access: ENUM_AWS_S3_ACCESSIBILITY;

    /**
     * Raw S3 object data
     * @description Internal data stream containing the actual object content, excluded from API responses
     */
    @Exclude()
    @ApiHideProperty()
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => Promise<string>;
        transformToByteArray?: () => Promise<Buffer>;
        transformToWebStream?: () => Promise<ReadableStream<Buffer>>;
    };

    /**
     * Size of the object in bytes
     * @description The total size of the stored object measured in bytes
     */
    @ApiProperty({
        required: true,
        example: 1024,
        description: 'Size of the object in bytes',
    })
    size: number;
}
