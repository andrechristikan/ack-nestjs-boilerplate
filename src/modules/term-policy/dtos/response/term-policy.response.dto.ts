import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { TermContentDto } from '@modules/term-policy/dtos/term-policy.content.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumTermPolicyStatus, EnumTermPolicyType } from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class TermPolicyResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Type of terms or policy',
        enum: EnumTermPolicyType,
        example: EnumTermPolicyType.termsOfService,
        required: true,
    })
    @Expose()
    readonly type: EnumTermPolicyType;

    @ApiProperty({
        description: 'Status of terms or policy',
        enum: EnumTermPolicyStatus,
        example: EnumTermPolicyStatus.draft,
        required: true,
    })
    @Expose()
    readonly status: EnumTermPolicyStatus;

    @ApiProperty({
        required: true,
        type: [TermContentDto],
        isArray: true,
    })
    @Expose()
    @Type(() => TermContentDto)
    readonly contents: TermContentDto[];

    @ApiProperty({
        description: 'Version of the terms or policy',
        example: 1,
        required: true,
    })
    @Expose()
    readonly version: number;

    @ApiProperty({
        required: false,
        description: 'Published date of the terms or policy',
        example: '2023-01-01T00:00:00.000Z',
    })
    @Expose()
    readonly publishedAt?: Date;
}
