import { ApiProperty } from '@nestjs/swagger';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class TermPolicyUpdateDocumentRequestDto extends AwsS3PresignRequestDto {
    @ApiProperty({
        description: 'Language of the terms policy',
        example: ENUM_MESSAGE_LANGUAGE.EN,
        enum: ENUM_MESSAGE_LANGUAGE,
        required: true,
    })
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    @IsNotEmpty()
    readonly language: ENUM_MESSAGE_LANGUAGE;
}
