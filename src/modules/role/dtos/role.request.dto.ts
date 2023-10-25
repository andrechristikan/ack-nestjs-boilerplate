import { IsNotEmpty, IsUUID } from 'class-validator';

export class RoleRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    role: string;
}
