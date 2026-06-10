import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TermPolicyUserAcceptanceResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        description: 'Identifier of the user who accepted the terms or policy',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @Expose()
    readonly userId: string;

    @ApiProperty({
        required: true,
        type: UserListResponseDto,
    })
    @Expose()
    @Type(() => UserListResponseDto)
    readonly user: UserListResponseDto;

    @ApiProperty({
        description: 'Identifier of the terms or policy accepted',
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @Expose()
    readonly termPolicyId: string;

    @ApiProperty({
        required: true,
        type: TermPolicyResponseDto,
    })
    @Expose()
    @Type(() => TermPolicyResponseDto)
    readonly termPolicy: TermPolicyResponseDto;

    @ApiProperty({
        description: 'Date when the terms or policy was accepted',
        example: faker.date.recent(),
        required: true,
    })
    @Expose()
    readonly acceptedAt: Date;
}
