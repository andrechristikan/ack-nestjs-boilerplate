import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { DatabaseObjectIdDto } from '@common/database/dtos/database.object-id.dto';

export class TermsPolicyGetResponseDto extends PickType(DatabaseObjectIdDto, [
    '_id',
] as const) {
    @ApiProperty({
        description: 'Type of terms or policy',
        enum: ENUM_TERMS_POLICY_TYPE,
        example: ENUM_TERMS_POLICY_TYPE.TERMS,
        required: true,
    })
    @Expose()
    readonly type: ENUM_TERMS_POLICY_TYPE;

    @ApiProperty({
        description: 'Title of the terms or policy',
        example: 'Terms of Service',
        required: true,
    })
    @Expose()
    readonly title: string;

    @ApiProperty({
        description: 'Brief description of the terms or policy',
        example: 'Legal terms governing the use of our services',
        required: true,
    })
    @Expose()
    readonly description: string;

    @ApiProperty({
        description: 'Full content of the terms or policy',
        example: 'These Terms of Service govern your use of our platform...',
        required: true,
    })
    @Expose()
    readonly content: string;

    @ApiProperty({
        description: 'Language of the terms or policy',
        enum: ENUM_MESSAGE_LANGUAGE,
        example: ENUM_MESSAGE_LANGUAGE.EN,
        required: true,
    })
    @Expose()
    readonly language: ENUM_MESSAGE_LANGUAGE;

    @ApiProperty({
        description: 'Version of the terms or policy',
        example: 1,
        required: true,
    })
    @Expose()
    readonly version: number;
}
