import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

export class TermsPolicyCreateRequestDto {
    @ApiProperty({
        description: 'Title of the terms policy',
        example: 'Privacy Policy',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly title: string;

    @ApiProperty({
        description: 'Description of the terms policy',
        example: 'A brief excerpt of the policy, why is exist and what covers',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly description: string;

    @ApiProperty({
        description: 'Content of the terms policy',
        example: 'These are the terms and conditions...',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly content: string;

    @ApiProperty({
        description: 'Version of the terms policy',
        example: 1,
        required: true,
    })
    @IsNumber()
    @IsNotEmpty()
    readonly version: number;

    @ApiProperty({
        description: 'Country for which this legal policy applies to',
        example: 'UK',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly country: string;

    @ApiProperty({
        description: 'Language of the terms policy',
        example: ENUM_MESSAGE_LANGUAGE.EN,
        enum: ENUM_MESSAGE_LANGUAGE,
        required: true,
    })
    @IsEnum(ENUM_MESSAGE_LANGUAGE)
    @IsNotEmpty()
    readonly language: ENUM_MESSAGE_LANGUAGE;

    @ApiProperty({
        description: 'Type of the terms policy',
        example: ENUM_TERMS_POLICY_TYPE.PRIVACY,
        enum: ENUM_TERMS_POLICY_TYPE,
        required: true,
    })
    @IsEnum(ENUM_TERMS_POLICY_TYPE)
    @IsNotEmpty()
    readonly type: ENUM_TERMS_POLICY_TYPE;

    @ApiProperty({
        description: 'Date of publication',
        example: new Date(),
        required: false,
        default: new Date(),
    })
    @IsDate()
    @IsOptional()
    readonly publishedAt?: Date;
}
