import { ResetPasswordCreteResponseDto } from '@module/reset-password/dtos/response/reset-password.create.response.dto';
import { ResetPasswordDoc } from '@module/reset-password/repository/entities/reset-password.entity';

export interface IResetPasswordRequest {
    resetPassword: ResetPasswordDoc;
    created: ResetPasswordCreteResponseDto;
}
