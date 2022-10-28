import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class PermissionRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    permission: string;
}
