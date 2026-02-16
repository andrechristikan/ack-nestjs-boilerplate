import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { IDeviceService } from '@modules/device/interfaces/device.service.interface';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeviceService implements IDeviceService {
    constructor(private readonly deviceRepository: DeviceRepository) {}

    async refresh(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const existDevice = await this.deviceRepository.exist(
            userId,
            fingerprint
        );
        if (!existDevice) {
            throw new NotFoundException({
                statusCode: EnumDeviceStatusCodeError.notFound,
                message: 'device.error.notFound',
            });
        }

        try {
            await this.deviceRepository.refresh(
                userId,
                {
                    fingerprint,
                    name,
                    notificationToken,
                    platform,
                },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}

// async refresh(
//     user: IUser,
//     refreshToken: string,
//     device: UserDeviceDto,
//     requestLog: IRequestLog
// ): Promise<IResponseReturn<AuthTokenResponseDto>> {
//     const {
//         sessionId,
//         userId,
//         jti: oldJti,
//         loginFrom,
//         loginWith,
//     } = this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
//         refreshToken
//     );

//     const session = await this.sessionUtil.getLogin(userId, sessionId);
//     if (session.jti !== oldJti) {
//         throw new UnauthorizedException({
//             statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
//             message: 'auth.error.refreshTokenInvalid',
//         });
//     }

//     try {
//         const {
//             jti: newJti,
//             tokens,
//             expiredInMs,
//         } = this.authUtil.refreshToken(user, refreshToken);

//         await Promise.all([
//             this.sessionUtil.updateLogin(
//                 userId,
//                 sessionId,
//                 session,
//                 newJti,
//                 expiredInMs
//             ),
//             this.userRepository.refresh(
//                 userId,
//                 {
//                     sessionId,
//                     jti: newJti,
//                     expiredAt: session.expiredAt,
//                     loginFrom: loginFrom,
//                     loginWith: loginWith,
//                 },
//                 device,
//                 requestLog
//             ),
//         ]);

//         return {
//             data: tokens,
//         };
//     } catch (err: unknown) {
//         throw new InternalServerErrorException({
//             statusCode: EnumAppStatusCodeError.unknown,
//             message: 'http.serverError.internalServerError',
//             _error: err,
//         });
//     }
// }
