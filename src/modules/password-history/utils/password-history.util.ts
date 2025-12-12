import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PasswordHistoryUtil {
    mapList(
        passwordHistories: IPasswordHistory[]
    ): PasswordHistoryResponseDto[] {
        return plainToInstance(PasswordHistoryResponseDto, passwordHistories);
    }
}
