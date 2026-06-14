import { ResponseUtil } from '@common/response/utils/response.util';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

    mapList(
        passwordHistories: IPasswordHistory[]
    ): PasswordHistoryResponseDto[] {
        return this.responseUtil.serialize(
            PasswordHistoryResponseDto,
            passwordHistories
        );
    }
}
