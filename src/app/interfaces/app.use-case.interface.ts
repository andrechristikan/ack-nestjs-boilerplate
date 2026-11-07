export interface IAppUseCase<TArgs extends unknown[], TResult> {
    execute(...args: TArgs): Promise<TResult>;
}
