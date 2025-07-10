import { PartialType } from '@nestjs/swagger';
import { TermPolicyCreateRequestDto } from './term-policy.create.request.dto';

export class TermPolicyUpdateRequestDto extends PartialType(TermPolicyCreateRequestDto) {
    // PartialType from @nestjs/swagger preserves decorators while making all properties optional
    // This means all validation and API documentation is maintained
    // All fields from TermPolicyCreateRequestDto will be included as optional
}
