import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserVerificationHttpService } from '@modules/user/services/user.verification.http.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import type { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';

describe('UserVerificationHttpService', () => {
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();

    let service: UserVerificationHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationHttpService,
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
            ],
        }).compile();
        service = module.get(UserVerificationHttpService);
    });

    describe('verifyEmail', () => {
        it('delegates the token to the domain', async () => {
            const dto: UserVerifyEmailRequestDto = { token: 'raw-token' };

            await service.verifyEmail(dto);

            expect(userVerificationDomain.verifyEmail).toHaveBeenCalledWith(
                'raw-token'
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('delegates the email to the domain', async () => {
            const dto: UserSendEmailVerificationRequestDto = {
                email: 'wren@example.com',
            };

            await service.sendVerificationEmail(dto);

            expect(
                userVerificationDomain.sendVerificationEmail
            ).toHaveBeenCalledWith('wren@example.com');
        });
    });
});
