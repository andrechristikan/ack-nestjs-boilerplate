import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import { DatabaseUUIDDto } from '@common/database/dtos/database.uuid.dto';
import { TermDocumentResponseDto } from '@modules/term-policy/dtos/response/term-policy.document.response.dto';
import { Type } from 'class-transformer';

export class TermPolicyResponseDto extends DatabaseUUIDDto {
    @ApiProperty({
        description: 'Type of terms or policy',
        enum: ENUM_TERM_POLICY_TYPE,
        example: ENUM_TERM_POLICY_TYPE.TERM,
        required: true,
    })
    readonly type: ENUM_TERM_POLICY_TYPE;

    @ApiProperty({
        description: 'Status of terms or policy',
        enum: ENUM_TERM_POLICY_STATUS,
        example: ENUM_TERM_POLICY_STATUS.DRAFT,
        required: true,
    })
    readonly status: ENUM_TERM_POLICY_STATUS;

    @ApiProperty({
        required: true,
        type: TermDocumentResponseDto,
        description: 'List of URLs for the terms or policy documents',
        oneOf: [{ $ref: getSchemaPath(TermDocumentResponseDto) }],
        isArray: true,
    })
    @Type(() => TermDocumentResponseDto)
    readonly urls: TermDocumentResponseDto[];

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

    @ApiProperty({
        required: false,
        description: 'Published date of the terms or policy',
        example: '2023-01-01T00:00:00.000Z',
    })
    readonly publishedAt?: Date;
}
