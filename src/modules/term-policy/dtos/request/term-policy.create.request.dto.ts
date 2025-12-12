import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { TermPolicyContentsRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { IntersectionType, PickType } from '@nestjs/swagger';

export class TermPolicyCreateRequestDto extends IntersectionType(
    TermPolicyAcceptRequestDto,
    TermPolicyContentsRequestDto,
    PickType(TermPolicyContentPresignRequestDto, ['version'] as const)
) {}
