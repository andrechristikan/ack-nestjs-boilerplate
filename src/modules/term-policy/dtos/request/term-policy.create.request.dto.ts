import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsEnum,
    IsNotEmpty,
    IsNotEmptyObject,
    IsString,
    IsUUID,
} from 'class-validator';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyUpdateDocumentRequestDto } from '@modules/term-policy/dtos/request/term-policy.update-document.request';
import { Type } from 'class-transformer';
import { faker } from '@faker-js/faker';

export class TermPolicyCreateRequestDto {
    @ApiProperty({
        description: 'Country for which this legal policy applies to',
        example: faker.string.uuid(),
        required: true,
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    readonly country: string;

    @ApiProperty({
        description: 'Type of the terms policy',
        example: ENUM_TERM_POLICY_TYPE.PRIVACY,
        enum: ENUM_TERM_POLICY_TYPE,
        required: true,
    })
    @IsEnum(ENUM_TERM_POLICY_TYPE)
    @IsNotEmpty()
    readonly type: ENUM_TERM_POLICY_TYPE;

    @ApiProperty({
        description: 'List of documents associated with the terms policy',
        type: TermPolicyUpdateDocumentRequestDto,
        required: true,
        isArray: true,
    })
    @IsNotEmpty()
    @ArrayNotEmpty()
    @IsNotEmptyObject(
        {
            nullable: false,
        },
        { each: true }
    )
    @Type(() => TermPolicyUpdateDocumentRequestDto)
    readonly urls: TermPolicyUpdateDocumentRequestDto[];
}
