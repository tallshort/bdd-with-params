# Mocha bdd with params interface for WebdriverIO

Set the following option in `wdio.config.js`

```javascript
    mochaOpts: {
        ui: 'bddParams'
    },
```

Test spec example
```javascript
describe('Some spec', function() {
    it('test params', params([
        { a: 1, b: 2, testname: 'test1' },
        { a: 3, b: 4, testname: 'test2' }
    ], function ({ a, b }) {
        // ...
    }));
});
```
