import { PickType } from '@nestjs/swagger';
import { TermPolicyGetRequestDto } from '@modules/term-policy/dtos/request/term-policy.get.request.dto';

export class TermPolicyListRequestDto extends PickType(TermPolicyGetRequestDto, ['lang']) {

}
