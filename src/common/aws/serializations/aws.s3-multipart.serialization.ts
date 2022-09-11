import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';

export class AwsS3MultipartPartsSerialization {
    @Type(() => String)
    ETag: string;

    @Type(() => Number)
    PartNumber: number;
}

export class AwsS3MultipartSerialization extends PartialType(
    AwsS3Serialization
) {
    @Type(() => String)
    uploadId: string;

    @Type(() => Number)
    partNumber?: number;

    @Type(() => Number)
    maxPartNumber?: number;

    @Type(() => AwsS3MultipartPartsSerialization)
    parts?: AwsS3MultipartPartsSerialization[];
}
