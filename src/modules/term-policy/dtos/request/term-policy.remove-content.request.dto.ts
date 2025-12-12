import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { PickType } from '@nestjs/swagger';

export class TermPolicyRemoveContentRequestDto extends PickType(
    TermPolicyContentPresignRequestDto,
    ['language'] as const
) {}
