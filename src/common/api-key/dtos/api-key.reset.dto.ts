import { IsNotEmpty, IsString } from 'class-validator';

export class ApiKeyResetDto {
    @IsString()
    @IsNotEmpty()
    hash: string;
}
