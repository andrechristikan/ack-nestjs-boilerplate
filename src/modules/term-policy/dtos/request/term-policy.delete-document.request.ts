import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class TermPolicyDeleteDocumentRequestDto {
    @ApiProperty({
        description: 'Language of the terms policy',
        example: ENUM_MESSAGE_LANGUAGE.EN,
        enum: ENUM_MESSAGE_LANGUAGE,
        required: true,
    })
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    @IsNotEmpty()
    readonly language: ENUM_MESSAGE_LANGUAGE;
}
