import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
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
    eTag: string;

    @ApiProperty({
        required: true,
        example: 1,
        description: 'Part number in the multipart upload',
    })
    partNumber: number;

    @ApiProperty({
        required: true,
        example: 1024,
        description: 'Size of the part in bytes',
    })
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
    uploadId: string;

    @ApiProperty({
        required: true,
        example: 1,
        description: 'Last part number uploaded',
    })
    lastPartNumber: number;

    @ApiProperty({
        required: true,
        example: 200,
        description: 'Max part number, or length of the chunk',
    })
    maxPartNumber: number;

    @ApiProperty({
        required: true,
        type: [AwsS3MultipartPartResponseDto],
    })
    parts: AwsS3MultipartPartResponseDto[];
}
