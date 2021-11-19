var Mocha = require('mocha');
var Test = require('mocha/lib/test');
var EVENT_FILE_PRE_REQUIRE = require('mocha/lib/suite').constants.EVENT_FILE_PRE_REQUIRE;
var mochaConstants = require('@wdio/mocha-framework/build/constants');

// Replace 'it' with '_it' to avoid wdio mocha-framework wrapping the params related APIs.
mochaConstants.INTERFACES['bdd'][0] = '_it';

/**
 * BDD-style with params interface:
 *
 *      describe('Some test', function() {
 *         it('test params', params([
 *            { a: 1, b: 2, testname: 'test1' },
 *            { a: 3, b: 4, testname: 'test2' }
 *          ], function ({ a, b }) {
 *            // ...
 *          });
 *      });
 *
 * @param {Suite} suite Root suite.
 */
module.exports = Mocha.interfaces['bddParams'] = function(suite) {
    var suites = [suite];

    suite.on(EVENT_FILE_PRE_REQUIRE, function(context, file, mocha) {
        var common = require('mocha/lib/interfaces/common')(suites, context, mocha);

        context.before = common.before;
        context.after = common.after;
        context.beforeEach = common.beforeEach;
        context.afterEach = common.afterEach;
        context.run = mocha.options.delay && common.runWithSuite(suite);
    
        /**
         * Describe a "suite" with the given `title`
         * and callback `fn` containing nested suites
         * and/or tests.
         */
        context.describe = context.context = function(title, fn) {
            return common.suite.create({
                title: title,
                file: file,
                fn: fn
            });
        };

        /**
         * Pending describe.
         */
        context.xdescribe = context.xcontext = context.describe.skip = function(
            title,
            fn
        ) {
            return common.suite.skip({
                title: title,
                file: file,
                fn: fn
            });
        };

        /**
         * Exclusive suite.
         */
        context.describe.only = function(title, fn) {
            return common.suite.only({
                title: title,
                file: file,
                fn: fn
            });
        };

        /**
         * Describe a specification or test-case
         * with the given `title` and callback `fn`
         * acting as a thunk.
         */
        context._it = context._specify = function(title, fn) {
            var suite = suites[0];
            if (suite.isPending()) {
                fn = null;
            }
            var test = new Test(title, fn);
            test.file = file;
            suite.addTest(test);
            return test;
        };

        /**
         * Exclusive test-case.
         */
        context._it.only = function(title, fn) {
            return common.test.only(mocha, context._it(title, fn));
        };

        /**
         * Pending test case.
         */
        context._xit = context._xspecify = context._it.skip = function(title) {
            return context._it(title);
        };

        /**
         * Number of attempts to retry.
         */
        context._it.retries = function(n) {
            context.retries(n);
        };

        /**
         * Specify the test params and its associated test function.
         */
        context.params = function(params, fn) {
            params.forEach(function(param) {
                verifyParam(param);
            });
            return {
                params,
                fn
            };
        };

        /**
         * Verify test param.
         */
        function verifyParam(param) {
            if (!param.testname) {
                throw Error(`missing/empty 'testname' in test param ${JSON.stringify(param)}`);
            }
        }

        /**
         * Priority marker: p0, p1, p2.
         */
        context.priority = function() {
            // create priority functions with name
            const p0 = function(title) {
                return titleWithPriority(title, 'p0');
            };
            const p1 = function(title) {
                return titleWithPriority(title, 'p1');
            };
            const p2 = function(title) {
                return titleWithPriority(title, 'p2');
            };
            return {
                p0, p1, p2
            };
        }();

        /**
         * Generates title with priority.
         *
         * @param {string} title test title
         * @param {string} priorityValue priorify value, e.g., p0.
         */
        function titleWithPriority(title, priorityValue) {
            return `[priority=${priorityValue}] ${title}`;
        }

        /**
         * Generates full title including test param and priority.
         */
        function fullTitle(title, param) {
            if (param.priority) {
                // priority orverriding
                const newTitle = title.replace(/\[priority=p\d\] /, '');
                const priority = typeof param.priority === 'function' ? param.priority.name : param.priority;
                return `[priority=${priority}] ${newTitle} - [${param.testname}]`;
            } else {
                return `${title} - [${param.testname}]`;
            }
        }

        /**
         * Describe a specification or test-case
         * with the given `title`, `params` or callback `fn`
         * acting as a thunk.
         */
        context.it = context.specify = function(title, fnOrParams) {
            if (fnOrParams && typeof fnOrParams === 'object') {
                let { params, fn } = fnOrParams;
                params.forEach(function(param) {
                    function paramFn() {
                        return fn.bind(this)(param);
                    }
                    // handle test skip in param
                    if (param.skip == undefined) {
                        context._it(fullTitle(title, param), paramFn);
                    } else {
                        context._it(fullTitle(title, param));
                    }
                });
            } else {
                return context._it(title, fnOrParams);
            }
        };

        /**
         * Exclusive test-case.
         */
        context.it.only = function(title, fnOrParams) {
            if (fnOrParams && typeof fnOrParams === 'object') {
                let { params, fn } = fnOrParams;
                params.forEach(function(param) {
                    function paramFn() {
                        return fn.bind(this)(param);
                    }
                    // handle test skip in param
                    if (param.skip == undefined) {
                        context._it.only(fullTitle(title, param), paramFn);
                    } else {
                        context._it.only(fullTitle(title, param));
                    }
                });
            } else {
                return context._it.only(title, fnOrParams);
            }
        };

        /**
         * Pending test case.
         */
        context.xit = context.xspecify = context.it.skip = function(title, fnOrParams) {
            if (fnOrParams && typeof fnOrParams === 'object') {
                let { params } = fnOrParams;
                params.forEach(function(param) {
                    context._it(fullTitle(title, param));
                });
            } else {
                return context._it(title);
            }
        };

        /**
         * Number of attempts to retry.
         */
        context.it.retries = function(n) {
            context.retries(n);
        };

    });
};

module.exports.description = 'BDD with test params';
