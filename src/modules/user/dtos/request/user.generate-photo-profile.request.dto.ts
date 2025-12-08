import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_FILE_EXTENSION_IMAGE } from '@common/file/enums/file.enum';
import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export class UserGeneratePhotoProfileRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_EXTENSION_IMAGE,
        default: ENUM_FILE_EXTENSION_IMAGE.jpg,
    })
    @IsString()
    @IsEnum(ENUM_FILE_EXTENSION_IMAGE)
    @IsNotEmpty()
    extension: ENUM_FILE_EXTENSION_IMAGE;
}
