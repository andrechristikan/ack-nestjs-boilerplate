import { AwsS3ResponseDto } from '@common/aws/dtos/response/aws.s3.response.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TermContentDto extends AwsS3ResponseDto {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: EnumMessageLanguage.en,
        enum: EnumMessageLanguage,
    })
    @Expose()
    readonly language: EnumMessageLanguage;
}
