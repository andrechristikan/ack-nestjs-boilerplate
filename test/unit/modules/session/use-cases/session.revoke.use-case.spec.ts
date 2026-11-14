import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { SessionService } from '@modules/session/services/session.service';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';

describe('SessionRevokeUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('admin-1', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
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
                requestContext,
                apiKeyContext,
                authContext,
                'session-1'
            );

            expect(result).toEqual({});
            expect(sessionService.revoke).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'session-1'
            );
        });

        it('rethrows the domain exception', async () => {
            const failure = new SessionNotFoundException();
            sessionService.revoke.mockRejectedValue(failure);

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'session-1'
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
