import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';

export class AwsS3MultipartPartDto {
    @ApiProperty({
        required: true,
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
        description: 'ETag from aws after init multipart',
    })
    eTag: string;

    @ApiProperty({
        required: true,
        example: 1,
    })
    partNumber: number;

    @ApiProperty({
        required: true,
        example: 1,
    })
    @Type(() => String)
    @Transform(({ value }) => Number.parseInt(value))
    size: number;
}

export class AwsS3MultipartDto extends AwsS3Dto {
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
        oneOf: [
            {
                $ref: getSchemaPath(AwsS3MultipartPartDto),
                type: 'array',
            },
        ],
    })
    @Type(() => AwsS3MultipartPartDto)
    parts: AwsS3MultipartPartDto[];
}
