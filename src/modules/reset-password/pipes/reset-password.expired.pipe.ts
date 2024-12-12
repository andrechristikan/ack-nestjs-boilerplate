import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { ResetPasswordDoc } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { ResetPasswordService } from 'src/modules/reset-password/services/reset-password.service';

@Injectable()
export class ResetPasswordExpiredPipe implements PipeTransform {
    constructor(private readonly resetPasswordService: ResetPasswordService) {}

    async transform(value: ResetPasswordDoc): Promise<ResetPasswordDoc> {
        if (!value.isActive) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.EXPIRED,
                message: 'resetPassword.error.expired',
            });
        }

        const checkExpired = this.resetPasswordService.checkExpired(
            value.expiredDate
        );
        if (checkExpired) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.EXPIRED,
                message: 'resetPassword.error.expired',
            });
        }

        return value;
    }
}
