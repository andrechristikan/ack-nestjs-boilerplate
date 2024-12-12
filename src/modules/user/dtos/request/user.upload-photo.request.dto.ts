import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_FILE_MIME_IMAGE } from 'src/common/file/enums/file.enum';

export class UserUploadPhotoRequestDto {
    @ApiProperty({
        type: 'string',
        enum: ENUM_FILE_MIME_IMAGE,
        default: ENUM_FILE_MIME_IMAGE.JPG,
    })
    @IsString()
    @IsEnum(ENUM_FILE_MIME_IMAGE)
    @IsNotEmpty()
    type: ENUM_FILE_MIME_IMAGE;
}
