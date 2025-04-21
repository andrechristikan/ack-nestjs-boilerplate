import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserCensorResponseDto } from 'src/modules/user/dtos/response/user.censor.response.dto';

export class UserCheckResponseDto {
    @ApiProperty({
        required: true,
    })
    exist: boolean;

    @ApiProperty({
        required: false,
        type: UserCensorResponseDto,
    })
    @Type(() => UserCensorResponseDto)
    user?: UserCensorResponseDto;
}

export class UserCheckUsernameResponseDto extends UserCheckResponseDto {
    @ApiProperty({
        required: true,
    })
    badWord: boolean;

    @ApiProperty({
        required: true,
    })
    pattern: boolean;
}
