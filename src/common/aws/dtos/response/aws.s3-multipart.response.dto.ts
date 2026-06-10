import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';

/**
 * Response DTO for a single part in an AWS S3 multipart upload.
 */
export class AwsS3MultipartPartResponseDto {
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'ETag from aws after init multipart',
    })
    @Expose()
    eTag: string;

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

/**
 * Response DTO for an AWS S3 multipart upload session.
 */
export class AwsS3MultipartResponseDto extends AwsS3ResponseDto {
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 20, casing: 'upper' }),
        description: 'Upload id from aws after init multipart',
    })
    @Expose()
    uploadId: string;

    @ApiProperty({
        required: true,
        example: 1,
        description: 'Last part number uploaded',
    })
    @Expose()
    lastPartNumber: number;

    @ApiProperty({
        required: true,
        example: 200,
        description: 'Max part number, or length of the chunk',
    })
    @Expose()
    maxPartNumber: number;

    @ApiProperty({
        required: true,
        type: [AwsS3MultipartPartResponseDto],
    })
    @Expose()
    parts: AwsS3MultipartPartResponseDto[];
}
