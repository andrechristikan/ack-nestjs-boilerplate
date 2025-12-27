import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TermPolicyUserAcceptanceResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Identifier of the user who accepted the terms or policy',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    readonly userId: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Type(() => UserListResponseDto)
    readonly user: UserListResponseDto;

    @ApiProperty({
        description: 'Identifier of the terms or policy accepted',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    readonly termPolicyId: string;

    @ApiProperty({
        required: true,
        type: TermPolicyResponseDto,
    })
    @Type(() => TermPolicyResponseDto)
    readonly termPolicy: TermPolicyResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: faker.date.recent(),
        required: true,
    })
    readonly acceptedAt: Date;
}
