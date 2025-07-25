import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DatabaseUUIDDto } from '@common/database/dtos/database.uuid.dto';
import { UserShortResponseDto } from '@modules/user/dtos/response/user.short.response.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';

export class TermPolicyAcceptanceResponseDto extends DatabaseUUIDDto {
    @ApiProperty({
        required: true,
        type: TermPolicyResponseDto,
        oneOf: [{ $ref: getSchemaPath(TermPolicyResponseDto) }],
    })
    @Type(() => TermPolicyResponseDto)
    readonly termPolicy: TermPolicyResponseDto;

    @ApiProperty({
        required: true,
        type: UserShortResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserShortResponseDto) }],
    })
    @Type(() => UserShortResponseDto)
    readonly user: UserShortResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: '2023-01-01T00:00:00.000Z',
        required: true,
    })
    readonly acceptedAt: Date;
}
