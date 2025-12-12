import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ApiProperty } from '@nestjs/swagger';

export class TermContentDto extends AwsS3Dto {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: EnumMessageLanguage.en,
        enum: EnumMessageLanguage,
    })
    readonly language: EnumMessageLanguage;
}
