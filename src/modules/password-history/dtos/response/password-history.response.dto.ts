import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { UserRefResponseDto } from '@modules/user/dtos/response/user.ref.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { EnumPasswordHistoryType } from '@generated/prisma-client';
import { Expose, Type } from 'class-transformer';

export class PasswordHistoryResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    @Expose()
    userId: string;

    @ApiProperty({
        required: true,
        type: UserRefResponseDto,
    })
    @Expose()
    @Type(() => UserRefResponseDto)
    user: UserRefResponseDto;

    password: string;

    @ApiProperty({
        required: true,
        example: EnumPasswordHistoryType.admin,
        enum: EnumPasswordHistoryType,
    })
    @Expose()
    type: EnumPasswordHistoryType;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    @Expose()
    expiredAt: Date;
}
