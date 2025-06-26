import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TermPolicyGetResponseDto } from '@modules/term-policy/dtos/response/term-policy.get.response.dto';
import { DatabaseObjectIdDto } from '@common/database/dtos/database.object-id.dto';

export class TermPolicyAcceptanceGetResponseDto extends DatabaseObjectIdDto {
    @ApiProperty({
        required: true,
        type: TermPolicyGetResponseDto,
        oneOf: [{ $ref: getSchemaPath(TermPolicyGetResponseDto) }],
    })
    @Type(() => TermPolicyGetResponseDto)
    readonly policy: TermPolicyGetResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: '2023-01-01T00:00:00.000Z',
        required: true,
    })
    readonly acceptedAt: Date;
}
