import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ENUM_FILE_MIME } from '@common/file/enums/file.enum';
import { TermPolicyCreateRequestDto } from './term-policy.create.request.dto';

export class TermPolicyUploadDocumentRequestDto extends PickType(
    TermPolicyCreateRequestDto,
    ['country', 'language', 'type', 'version'] as const
) {
    @ApiProperty({
        description: 'Mime type of the file',
        example: ENUM_FILE_MIME.HTML,
        enum: [ENUM_FILE_MIME.HTML, ENUM_FILE_MIME.PDF],
        required: true,
    })
    @IsEnum([ENUM_FILE_MIME.HTML, ENUM_FILE_MIME.PDF])
    @IsNotEmpty()
    readonly mime: ENUM_FILE_MIME;

    @ApiProperty({
        description: 'Size of the file in bytes',
        example: 1024000,
        required: true,
    })
    @IsNumber()
    @IsNotEmpty()
    readonly size: number;
}
