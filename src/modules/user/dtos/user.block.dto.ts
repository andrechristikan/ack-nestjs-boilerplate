import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';

export class UserBlockedDto extends PartialType(UserActiveDto) {
    @IsBoolean()
    @IsNotEmpty()
    blocked: boolean;
}
