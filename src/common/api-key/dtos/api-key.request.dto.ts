import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ApiKeyRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    apiKey: string;
}
