import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

export class TermPolicyGetRequestDto {
  @ApiProperty({
    enum: ENUM_TERM_POLICY_TYPE,
    required: true,
    description: 'The type of policy to retrieve',
  })
  @IsEnum(ENUM_TERM_POLICY_TYPE)
  type: ENUM_TERM_POLICY_TYPE;

  @ApiProperty({
    enum: ENUM_MESSAGE_LANGUAGE,
    required: true,
    description: 'Language to request',
  })
  @IsEnum(ENUM_MESSAGE_LANGUAGE)
  lang: ENUM_MESSAGE_LANGUAGE;
}
