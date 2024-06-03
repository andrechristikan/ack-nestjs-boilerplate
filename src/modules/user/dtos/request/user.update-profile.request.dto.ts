import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['firstName', 'lastName', 'mobileNumber', 'mobileNumberCode'] as const
) {
    @ApiProperty({
        required: false,
        maxLength: 200,
    })
    readonly address?: string;
}
