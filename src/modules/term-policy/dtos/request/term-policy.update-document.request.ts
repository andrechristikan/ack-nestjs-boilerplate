import { IntersectionType, PickType } from '@nestjs/swagger';
import { AwsS3PresignRequestDto } from '@modules/aws/dtos/request/aws.s3-presign.request.dto';
import { TermPolicyCreateRequestDto } from './term-policy.create.request.dto';

export class TermPolicyUpdateDocumentRequestDto extends IntersectionType(
    PickType(TermPolicyCreateRequestDto, [
        'title',
        'description',
        'version',
        'country',
        'language',
        'type',
        'publishedAt',
    ] as const),
    AwsS3PresignRequestDto
) {}
