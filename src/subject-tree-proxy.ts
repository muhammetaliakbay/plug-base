export interface SubjectTreeProxy<ARGS extends any[], T> {
    (...args: ARGS): T | undefined;

    [child: string]: SubjectTreeProxy<any, any>;
}
