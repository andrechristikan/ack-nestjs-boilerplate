import { Type } from 'class-transformer';
import { IsNotEmpty, IsMongoId } from 'class-validator';

export class RoleRequestDto {
    @IsNotEmpty()
    @IsMongoId()
    @Type(() => String)
    role: string;
}
