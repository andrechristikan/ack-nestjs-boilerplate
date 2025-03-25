import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { AwsS3PartPresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-part-presign.request.dto';

export class AwsS3MultipartPresignCompletePartRequestDto {
    @ApiProperty({
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    eTag: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsNumber({ allowInfinity: false, allowNaN: false })
    @Min(1)
    partNumber: number;
}
export class AwsS3MultipartPresignCompleteRequestDto extends PickType(
    AwsS3PartPresignRequestDto,
    ['key', 'uploadId'] as const
) {
    @ApiProperty({
        required: true,
        type: AwsS3MultipartPresignCompletePartRequestDto,
        isArray: true,
    })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => AwsS3MultipartPresignCompletePartRequestDto)
    parts: AwsS3MultipartPresignCompletePartRequestDto[];
}
