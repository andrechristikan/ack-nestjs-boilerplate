import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateIf } from 'class-validator';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';

export class UserLoginDto extends PickType(UserCreateDto, [
    'username',
    'password',
] as const) {
    @ApiProperty({
        description:
            'if true refresh token expired will extend to 30d, else 7d',
        example: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    @ValidateIf((e) => e.rememberMe !== '')
    readonly rememberMe?: boolean;
}
