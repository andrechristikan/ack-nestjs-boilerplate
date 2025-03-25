import { ApiProperty, PickType } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { AWS_S3_MAX_PART_NUMBER } from 'src/modules/aws/constants/aws.constant';
import { AwsS3PresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-presign.request.dto';

export class AwsS3PartPresignRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['key'] as const
) {
    @IsNotEmpty()
    @IsNumber({
        allowInfinity: false,
        allowNaN: false,
        maxDecimalPlaces: 0,
    })
    @IsInt()
    @Min(1)
    @Max(AWS_S3_MAX_PART_NUMBER)
    @ApiProperty({
        required: true,
        example: 1,
        minimum: 1,
        maximum: AWS_S3_MAX_PART_NUMBER,
        description: 'Part number',
    })
    partNumber: number;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        required: true,
    })
    uploadId: string;
}
