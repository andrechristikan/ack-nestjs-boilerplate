import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';
import { ResetPasswordDoc } from 'src/modules/reset-password/repository/entities/reset-password.entity';

export interface IResetPasswordRequest {
    resetPassword: ResetPasswordDoc;
    created: ResetPasswordCreteResponseDto;
}
