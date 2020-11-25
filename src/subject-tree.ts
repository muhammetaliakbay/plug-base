import {Subject, SubjectImpl} from "./subject";
import {AsyncResult} from "./async-result";
import {Observable} from "rxjs";

export interface SubjectTree<ARGS extends any[], T> extends Subject<ARGS, T> {
    child<CHILD_ARGS extends any[], CHILD_T>(key: string): SubjectTree<CHILD_ARGS, CHILD_T>;
}

export type GenesisModifier
    = (this: GenesisInvocationContext, ...args: any[]) => any | AsyncResult<any> | Promise<any> | Observable<any>;

export interface GenesisInvocationContext {
    path: string[]
}

export function createSubjectTree<ARGS extends any[], T>(
    genesis?: GenesisModifier
): SubjectTree<ARGS, T> {
    return new SubjectTreeImpl<ARGS, T>();
}

class SubjectTreeImpl<ARGS extends any[], T> extends SubjectImpl<ARGS, T> implements SubjectTree<ARGS, T> {
    private children: {[key: string]: SubjectTree<any, any>} = {};

    constructor(
        private treeGenesis?: GenesisModifier
    ) {
        super(
            treeGenesis == null ? undefined : treeGenesis.bind({
                path: []
            } as GenesisInvocationContext)
        );
    }

    child<CHILD_ARGS extends any[], CHILD_T>(key: string): SubjectTree<CHILD_ARGS, CHILD_T> {
        const treeGenesis = this.treeGenesis;
        return this.children[key] ??= new SubjectTreeImpl<CHILD_ARGS, CHILD_T>(
            treeGenesis == null ? undefined : (function (...args: any[]) {
                const context: GenesisInvocationContext = {
                    path: [key, ...this.path]
                };
                return treeGenesis.apply(context, args);
            })
        );
    }
}

