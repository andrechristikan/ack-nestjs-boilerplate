import { applyDecorators } from '@nestjs/common';
import { Doc, DocRequest, DocResponse } from '@common/doc/decorators/doc.decorator';
import { TermsPolicyListResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.list.response.dto';
import {
  TermsPolicyLanguageDocParam,
  TermsPolicyTypeDocParam,
} from '@modules/terms-policy/constants/terms-policy.constant.doc';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';

export function TermsPolicyPublicListDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: 'Request terms and policy for given language',
    }),
    DocRequest({
      params: [...TermsPolicyLanguageDocParam],
    }),
    DocResponse<TermsPolicyListResponseDto>('terms-policy.list', {
      dto: TermsPolicyListResponseDto,
    }),
  );
}

export function TermsPolicyPublicGetDoc(): MethodDecorator {
  return applyDecorators(
    Doc({
      summary: 'Request specific terms and policy for given language  and type',
    }),
    DocRequest({
      params: [
        ...TermsPolicyLanguageDocParam,
        ...TermsPolicyTypeDocParam,
      ],
    }),
    DocResponse<TermsPolicyGetResponseDto>('terms-policy.get', {
      dto: TermsPolicyGetResponseDto,
    }),
  );
}