import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ApiProperty } from '@nestjs/swagger';

export class TermContentDto extends AwsS3Dto {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: ENUM_MESSAGE_LANGUAGE.en,
        enum: ENUM_MESSAGE_LANGUAGE,
    })
    readonly language: ENUM_MESSAGE_LANGUAGE;
}
