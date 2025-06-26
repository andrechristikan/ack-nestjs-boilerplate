import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TermsPolicyGetResponseDto } from '@modules/terms-policy/dtos/response/terms-policy.get.response.dto';
import { DatabaseObjectIdDto } from '@common/database/dtos/database.object-id.dto';

export class TermsPolicyAcceptanceGetResponseDto extends DatabaseObjectIdDto {
    @ApiProperty({
        required: true,
        type: TermsPolicyGetResponseDto,
        oneOf: [{ $ref: getSchemaPath(TermsPolicyGetResponseDto) }],
    })
    @Type(() => TermsPolicyGetResponseDto)
    readonly policy: TermsPolicyGetResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: '2023-01-01T00:00:00.000Z',
        required: true,
    })
    readonly acceptedAt: Date;
}
