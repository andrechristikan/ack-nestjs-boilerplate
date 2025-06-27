import { ApiParamOptions } from '@nestjs/swagger';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { faker } from '@faker-js/faker';

export const TermPolicyDocParamsId: ApiParamOptions =
  {
    name: 'id',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: faker.string.alphanumeric(),
  }
;
export const TermPolicyAuthAcceptDocParam: ApiParamOptions = {
  name: 'type',
  allowEmptyValue: false,
  required: true,
  type: 'string',
  example: 'terms',
  description: 'Type of terms',
  enum: ENUM_TERM_POLICY_TYPE,
};

export const TermPolicyTypeDocParam: ApiParamOptions[] = [
  {
    name: 'type',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: 'terms',
    description: 'Type of terms',
    enum: ENUM_TERM_POLICY_TYPE,
  },
];

export const TermPolicyLanguageDocParam: ApiParamOptions[] = [
  {
    name: 'lang',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: 'it',
    description: 'Language to retrieve',
    enum: ENUM_MESSAGE_LANGUAGE,
  },
];