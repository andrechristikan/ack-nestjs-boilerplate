import { AwsS3ResponseDto } from '@modules/aws/dtos/response/aws.s3-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TermDocumentResponseDto extends AwsS3ResponseDto {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: 'en',
    })
    readonly language: string;
}
