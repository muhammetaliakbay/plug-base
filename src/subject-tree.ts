import {Subject, SubjectImpl} from "./subject";

export interface SubjectTree<ARGS extends any[], T> extends Subject<ARGS, T> {
    child<CHILD_ARGS extends any[], CHILD_T>(key: string): SubjectTree<CHILD_ARGS, CHILD_T>;
}

export function createSubjectTree<ARGS extends any[], T>(): SubjectTree<ARGS, T> {
    return new SubjectTreeImpl<ARGS, T>();
}

class SubjectTreeImpl<ARGS extends any[], T> extends SubjectImpl<ARGS, T> implements SubjectTree<ARGS, T> {
    private children: {[key: string]: SubjectTree<any, any>} = {};

    child<CHILD_ARGS extends any[], CHILD_T>(key: string): SubjectTree<CHILD_ARGS, CHILD_T> {
        return this.children[key] ??= new SubjectTreeImpl<CHILD_ARGS, CHILD_T>();
    }
}

