import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_FILE_MIME_DOCUMENT } from '@common/file/enums/file.enum';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';

export class TermPolicyUploadDocumentRequestDto extends PickType(
    AwsS3PresignRequestDto,
    ['size']
) {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_MIME_DOCUMENT,
        default: ENUM_FILE_MIME_DOCUMENT.PDF,
    })
    @IsString()
    @IsEnum(ENUM_FILE_MIME_DOCUMENT)
    @IsNotEmpty()
    mime: ENUM_FILE_MIME_DOCUMENT;
}
