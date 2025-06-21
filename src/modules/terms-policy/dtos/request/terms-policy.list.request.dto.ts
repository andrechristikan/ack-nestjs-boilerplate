import { PickType } from '@nestjs/swagger';
import { TermsPolicyGetRequestDto } from '@modules/terms-policy/dtos/request/terms-policy.get.request.dto';

export class TermsPolicyListRequestDto extends PickType(TermsPolicyGetRequestDto, ['lang']) {

}
