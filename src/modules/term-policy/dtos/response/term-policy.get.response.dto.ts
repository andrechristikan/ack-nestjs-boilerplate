import { ApiProperty, PickType } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { DatabaseUUIDDto } from '@common/database/dtos/database.uuid.dto';

export class TermPolicyGetResponseDto extends PickType(DatabaseUUIDDto, [
    '_id',
] as const) {
    @ApiProperty({
        description: 'Type of terms or policy',
        enum: ENUM_TERM_POLICY_TYPE,
        example: ENUM_TERM_POLICY_TYPE.TERM,
        required: true,
    })
    readonly type: ENUM_TERM_POLICY_TYPE;

    @ApiProperty({
        description: 'Title of the terms or policy',
        example: 'Terms of Service',
        required: true,
    })
    readonly title: string;

    @ApiProperty({
        description: 'Brief description of the terms or policy',
        example: 'Legal terms governing the use of our services',
        required: true,
    })
    readonly description: string;

    @ApiProperty({
        description: 'Full content of the terms or policy',
        example: 'These Terms of Service govern your use of our platform...',
        required: true,
    })
    readonly content: string;

    @ApiProperty({
        description: 'Language of the terms or policy',
        enum: ENUM_MESSAGE_LANGUAGE,
        example: ENUM_MESSAGE_LANGUAGE.EN,
        required: true,
    })
    readonly language: ENUM_MESSAGE_LANGUAGE;

    @ApiProperty({
        description: 'Country for which the terms or policy applies',
        example: 'UK',
        required: true,
    })
    readonly country: string;

    @ApiProperty({
        description: 'Version of the terms or policy',
        example: 1,
        required: true,
    })
    readonly version: number;
}
