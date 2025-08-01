import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from '@common/file/enums/file.enum';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';

export class UserUploadPhotoProfileRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_MIME_IMAGE,
        default: ENUM_FILE_MIME_IMAGE.JPG,
    })
    @IsString()
    @IsEnum(ENUM_FILE_MIME_IMAGE)
    @IsNotEmpty()
    mime: ENUM_FILE_MIME_IMAGE;
}
