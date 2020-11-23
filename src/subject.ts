export type Modifier<ARGS extends any[], T>
    = (this: InvocationContext<ARGS, T>, ...args: ARGS) => T;

export interface InvocationContext<ARGS extends any[], T> {
    overridden?: Invocation<ARGS, T>;
}
export type Invocation<ARGS extends any[], T> = (...args: ARGS) => T;

export interface Subject<ARGS extends any[], T> {
    pre(modifier: Modifier<ARGS, T>): void;
    post(modifier: Modifier<ARGS, T>): void;
    remove(modifier: Modifier<ARGS, T>): void;
    invoke(...args: ARGS): T | undefined;
}

export function createSubject<ARGS extends any[], T>(): Subject<ARGS, T> {
    return new SubjectImpl<ARGS, T>();
}

export class SubjectImpl<ARGS extends any[], T> implements Subject<ARGS, T> {
    private modifiers: Modifier<ARGS, T>[] = [];

    pre(modifier: Modifier<ARGS, T>): void {
        this.modifiers.push(modifier);
    }

    post(modifier: Modifier<ARGS, T>): void {
        this.modifiers.splice(0, 0, modifier);
    }

    remove(modifier: Modifier<ARGS, T>) {
        const index = this.modifiers.indexOf(modifier);
        if (index > -1) {
            this.modifiers.splice(index, 1);
        }
    }

    private static invocation<ARGS extends any[], T>(
        modifier: Modifier<ARGS, T>, overridden: Modifier<ARGS, T>[]
    ): Invocation<ARGS, T> {
        const context: InvocationContext<ARGS, T> = {
        };

        if (overridden.length > 0) {
            const [next, ...veryNext] = overridden;
            context.overridden = SubjectImpl.invocation(next, veryNext);
        }

        return modifier.bind(
            context
        );
    }

    invoke(...args: ARGS): T | undefined {
        if(this.modifiers.length > 0) {
            const [modifier, ...overridden] = this.modifiers;
            const invocation = SubjectImpl.invocation(
                modifier, overridden
            );
            return invocation(...args);
        } else {
            return undefined;
        }
    }
}
