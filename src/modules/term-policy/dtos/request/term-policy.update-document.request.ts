import { IntersectionType } from '@nestjs/swagger';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';
import { TermPolicyDeleteDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.delete-document.request';

export class TermPolicyUpdateDocumentRequestDto extends IntersectionType(
    TermPolicyDeleteDocumentRequestDto,
    AwsS3PresignRequestDto
) {}
