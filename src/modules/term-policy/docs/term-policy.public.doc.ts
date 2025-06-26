import { applyDecorators } from '@nestjs/common';
import { Doc, DocRequest, DocResponse } from '@common/doc/decorators/doc.decorator';
import { TermPolicyListResponseDto } from '@modules/term-policy/dtos/response/term-policy.list.response.dto';
import {
  TermPolicyLanguageDocParam,
  TermPolicyTypeDocParam,
} from '@modules/term-policy/constants/term-policy.doc.constant';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';

export function TermPolicyPublicListDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: 'Request terms and policy for given language',
    }),
    DocRequest({
      params: [...TermPolicyLanguageDocParam],
    }),
    DocResponse<TermPolicyListResponseDto>('term-policy.list', {
      dto: TermPolicyListResponseDto,
    }),
  );
}

export function TermPolicyPublicGetDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: 'Request specific terms and policy for given language  and type',
    }),
    DocRequest({
      params: [
        ...TermPolicyLanguageDocParam,
        ...TermPolicyTypeDocParam,
      ],
    }),
    DocResponse<TermPolicyGetResponseDto>('term-policy.get', {
      dto: TermPolicyGetResponseDto,
    }),
  );
}