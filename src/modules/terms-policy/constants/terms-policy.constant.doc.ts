import { ApiParamOptions } from '@nestjs/swagger';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { faker } from '@faker-js/faker';

export const TermsPolicyDocParamsId: ApiParamOptions =
  {
    name: 'id',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: faker.string.alphanumeric(),
  }
;
export const TermsPolicyAuthAcceptDocParam: ApiParamOptions = {
  name: 'type',
  allowEmptyValue: false,
  required: true,
  type: 'string',
  example: 'terms',
  description: 'Type of terms',
  enum: ENUM_TERMS_POLICY_TYPE,
};

export const TermsPolicyTypeDocParam: ApiParamOptions[] = [
  {
    name: 'type',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: 'terms',
    description: 'Type of terms',
    enum: ENUM_TERMS_POLICY_TYPE,
  },
];

export const TermsPolicyLanguageDocParam: ApiParamOptions[] = [
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