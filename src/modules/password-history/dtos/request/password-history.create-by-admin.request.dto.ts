import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { PasswordHistoryCreateRequestDto } from 'src/modules/password-history/dtos/request/password-history.create.request.dto';

export class PasswordHistoryCreateByAdminRequestDto extends PasswordHistoryCreateRequestDto {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    by: string;
}
