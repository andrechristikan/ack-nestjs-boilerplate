import { ConfigService } from '@nestjs/config';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { ENUM_HELPER_IMAGE } from '../helper.constant';

export class HelperImageValidation {
    @IsEnum(ENUM_HELPER_IMAGE)
    mime: string;

    @IsInt()
    @Min(0)
    @Max(1048576)
    size: string;
}
