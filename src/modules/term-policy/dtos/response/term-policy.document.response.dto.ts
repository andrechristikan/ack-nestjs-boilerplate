import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TermDocumentResponseDto extends AwsS3Dto {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: 'en',
    })
    readonly language: string;
}
