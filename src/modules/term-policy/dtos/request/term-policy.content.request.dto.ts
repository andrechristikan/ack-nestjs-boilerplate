import { TermPolicyContentPresignRequestDto } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsNotEmpty,
    IsObject,
    IsString,
    ValidateNested,
} from 'class-validator';

export class TermPolicyContentRequestDto extends PickType(
    TermPolicyContentPresignRequestDto,
    ['language', 'size'] as const
) {
    @ApiProperty({
        required: true,
        description: 'Key of the term document in storage',
        example: 'terms/privacy/en/terms_privacy_en_v1.pdf',
    })
    @IsString()
    @IsNotEmpty()
    readonly key: string;
}

export class TermPolicyContentsRequestDto {
    @ApiProperty({
        description: 'Contents of the terms policy',
        type: [TermPolicyContentRequestDto],
        isArray: true,
    })
    @Type(() => TermPolicyContentRequestDto)
    @IsNotEmpty({ each: true })
    @ValidateNested({ each: true })
    @ArrayUnique((content: TermPolicyContentRequestDto) => content.language)
    @ArrayNotEmpty()
    @IsObject({ each: true })
    readonly contents: TermPolicyContentRequestDto[];
}
