import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';

describe('SessionRevokeUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const context: IRequestContext = {
        actorUserId: 'admin-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    let useCase: SessionRevokeUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeUseCase,
                { provide: SessionService, useValue: sessionService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeUseCase);
    });

    describe('execute', () => {
        it('revokes the session passing the request context and returns an empty envelope', async () => {
            sessionService.revoke.mockResolvedValue();

            const result = await useCase.execute(
                'user-1',
                'session-1',
                context
            );

            expect(result).toEqual({});
            expect(sessionService.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                context
            );
        });

        it('rethrows the domain exception', async () => {
            const failure = new SessionNotFoundException();
            sessionService.revoke.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1', 'session-1', context);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
