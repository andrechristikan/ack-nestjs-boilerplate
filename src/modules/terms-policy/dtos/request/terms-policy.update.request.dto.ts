import { PartialType } from '@nestjs/swagger';
import { TermsPolicyCreateRequestDto } from './terms-policy.create.request.dto';

export class TermsPolicyUpdateRequestDto extends PartialType(TermsPolicyCreateRequestDto) {
    // PartialType from @nestjs/swagger preserves decorators while making all properties optional
    // This means all validation and API documentation is maintained
    // All fields from TermsPolicyCreateRequestDto will be included as optional
}
