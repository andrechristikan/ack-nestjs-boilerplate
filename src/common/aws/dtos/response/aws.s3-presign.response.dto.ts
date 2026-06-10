import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Response DTO for an AWS S3 presigned URL.
 */
export class AwsS3PresignResponseDto {
    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
        description: 'S3 object key/path',
    })
    @Expose()
    key: string;

    @ApiProperty({
        required: true,
        example: 'image/jpeg',
        description: 'MIME type of the object',
    })
    @Expose()
    mime: string;

    @ApiProperty({
        required: true,
        example: 'jpg',
        description: 'File extension',
    })
    @Expose()
    extension: string;

    @ApiProperty({
        required: true,
        example: faker.internet.url(),
        description: 'Presigned URL for uploading the object to S3',
    })
    @Expose()
    presignUrl: string;

    @ApiProperty({
        required: true,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    @Expose()
    expiredIn: number;
}

/**
 * Response DTO for a presigned URL targeting a specific multipart upload part.
 */
export class AwsS3PresignPartResponseDto extends AwsS3PresignResponseDto {
    @ApiProperty({
        required: true,
        example: 1,
        description: 'Part number in the multipart upload',
    })
    @Expose()
    partNumber: number;

    @ApiProperty({
        required: true,
        example: 1024,
        description: 'Size of the part in bytes',
    })
    @Expose()
    size: number;
}
