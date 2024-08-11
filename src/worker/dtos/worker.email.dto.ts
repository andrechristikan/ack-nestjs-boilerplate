import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';

export class WorkerEmailDto {
    @ApiProperty({
        required: true,
        type: () => EmailSendDto,
    })
    @IsObject()
    @IsNotEmpty()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => EmailSendDto)
    send: EmailSendDto;

    @ApiProperty({
        required: false,
        type: 'object',
    })
    @IsObject()
    @IsOptional()
    @IsNotEmptyObject()
    @ValidateNested()
    data?: Record<string, any>;
}
