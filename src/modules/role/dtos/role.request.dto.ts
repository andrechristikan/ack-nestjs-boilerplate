import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RoleRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    role: string;
}
