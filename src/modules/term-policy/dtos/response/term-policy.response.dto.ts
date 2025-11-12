import { DatabaseDto } from '@common/database/dtos/database.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';
import { Type } from 'class-transformer';

export class TermPolicyResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Type of terms or policy',
        enum: ENUM_TERM_POLICY_TYPE,
        example: ENUM_TERM_POLICY_TYPE.termsOfService,
        required: true,
    })
    readonly type: ENUM_TERM_POLICY_TYPE;

    @ApiProperty({
        description: 'Status of terms or policy',
        enum: ENUM_TERM_POLICY_STATUS,
        example: ENUM_TERM_POLICY_STATUS.draft,
        required: true,
    })
    readonly status: ENUM_TERM_POLICY_STATUS;

    @ApiProperty({
        required: true,
        type: TermContentDto,
        oneOf: [{ $ref: getSchemaPath(TermContentDto) }],
        isArray: true,
    })
    @Type(() => TermContentDto)
    readonly contents: TermContentDto[];

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
