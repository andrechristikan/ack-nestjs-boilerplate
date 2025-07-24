import { PickType } from '@nestjs/swagger';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

export class TermPolicyAcceptRequestDto extends PickType(
    TermPolicyCreateRequestDto,
    ['country', 'type']
) {}
