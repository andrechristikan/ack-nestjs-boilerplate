import { Type } from 'class-transformer';
import { IsNotEmpty, IsMongoId } from 'class-validator';

export class PermissionRequestDto {
    @IsNotEmpty()
    @IsMongoId()
    @Type(() => String)
    permission: string;
}
