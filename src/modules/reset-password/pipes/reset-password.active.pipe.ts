import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_RESET_PASSWORD_STATUS_CODE_ERROR } from 'src/modules/reset-password/enums/reset-password.status-code.enum';
import { ResetPasswordDoc } from 'src/modules/reset-password/repository/entities/reset-password.entity';

@Injectable()
export class ResetPasswordActivePipe implements PipeTransform {
    async transform(value: ResetPasswordDoc): Promise<ResetPasswordDoc> {
        if (value.isReset) {
            throw new BadRequestException({
                statusCode: ENUM_RESET_PASSWORD_STATUS_CODE_ERROR.INACTIVE,
                message: 'resetPassword.error.inactive',
            });
        }

        return value;
    }
}
