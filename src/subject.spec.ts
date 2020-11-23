import { expect } from "chai";
import {createSubject, Modifier} from "./subject";

describe('Subject Tests', () => {
    it('Invocation of empty subject must return undefined', () => {
        const subject = createSubject<[], number>();

        expect(subject.invoke()).to.be.undefined;
    });

    it('Invocation of 1-level subject must return the first modifier\'s result', () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;

        subject.post(firstModifier);

        expect(subject.invoke()).equals(firstModifier());
    });

    it('Invocation of 2-level subject must return the second modifier\'s result', () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier = () => 41;

        subject.post(firstModifier);
        subject.post(secondModifier);

        expect(subject.invoke()).equals(secondModifier());
    });

    it('Invocation of 2-level subject must return the first modifier\'s result', () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier = () => 41;

        subject.post(firstModifier);
        subject.pre(secondModifier);

        expect(subject.invoke()).equals(firstModifier());
    });

    it('Invocation of 2-level subject must return the first modifier\'s result modified by second modifier', () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier: Modifier<[], number> = function () {
            return this.overridden() + 1;
        };

        subject.post(firstModifier);
        subject.post(secondModifier);

        expect(subject.invoke()).equals(firstModifier() + 1);
    });

    it('Invocation of 3-level subject must return the recursively modified value by the modifier', () => {
        const subject = createSubject<[], number>();

        const modifier: Modifier<[], number> = function () {
            if (this.overridden == null) {
                return 0;
            } else {
                return this.overridden() + 1;
            }
        };

        subject.post(modifier);
        subject.post(modifier);
        subject.post(modifier);

        expect(subject.invoke()).equals(2);
    });

});