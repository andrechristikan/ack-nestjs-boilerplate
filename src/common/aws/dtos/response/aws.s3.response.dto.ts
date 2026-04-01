import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for AWS S3 object information.
 * HTTP response shape for S3 object metadata — excludes internal streaming data fields.
 */
export class AwsS3ResponseDto {
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'S3 bucket name',
    })
    bucket: string;

    @ApiProperty({
        required: true,
        example: faker.system.filePath(),
        description: 'S3 object key/path',
    })
    key: string;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
        description: 'CDN URL for the object',
    })
    cdnUrl: string | null;

    @ApiProperty({
        required: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
        description: 'Complete URL to access the object',
    })
    completedUrl: string;

    @ApiProperty({
        required: true,
        example: 'image/jpeg',
        description: 'MIME type of the object',
    })
    mime: string;

    @ApiProperty({
        required: true,
        example: 'jpg',
        description: 'File extension',
    })
    extension: string;

    @ApiProperty({
        required: false,
        example: EnumAwsS3Accessibility.public,
        enum: EnumAwsS3Accessibility,
        description: 'Access level for the S3 object',
        type: 'string',
    })
    access: EnumAwsS3Accessibility;

    @ApiProperty({
        required: true,
        example: 1024,
        description: 'Size of the object in bytes',
    })
    size: number;
}
