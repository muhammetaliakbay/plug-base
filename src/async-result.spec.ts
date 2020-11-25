import { expect, use } from "chai";
import ChaiAsPromised from 'chai-as-promised';
import {NoResultError, AsyncResult} from "./async-result";

use(ChaiAsPromised);

describe('AsyncResult Tests', () => {
    it('Empty AsyncResult as Promise must throw NoResultError', async () => {
        const promise = AsyncResult.fromValue().asPromise();

        await expect(promise).to.be.rejectedWith(NoResultError);
    });

});