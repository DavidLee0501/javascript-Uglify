# Navigo

A simple minimalistic JavaScript router with a fallback for older browsers.

![Travis](https://travis-ci.org/krasimir/navigo.svg?branch=master)

*([Demo source files](./demo))*

---

## Installation

Via npm with `npm install navigo` or drop `lib/navigo.min.js` into your page.

## Usage

### Initialization

```js
var root = null;
var useHash = true; // Defaults to: false
var hash = '#!'; // Defaults to: '#'
var router = new Navigo(root, useHash, hash);
```

The constructor of the library accepts three argument - `root`, `useHash` and `hash`. The first one is the main URL of
your application. If you call the constructor without parameters then Navigo figures out the root URL based on your routes.

If `useHash` set to `true` then the router uses an old routing approach with hash in the URL. Navigo anyways falls back
to this mode if there is no History API supported. The `hash` parameter allows you to configure the hash character. To
make your URLs crawlable by Google you should use use '#!'. Read more at [developers.google.com](https://developers.google.com/webmasters/ajax-crawling/docs/learn-more).

### Adding a route

```js
router
  .on('/products/list', function () {
    // display all the products
  })
  .resolve();
```

### Adding a main/root handler

```js
router
  .on(function () {
    // show home page here
  })
  .resolve();
```

### Adding multiple routes

```js
router
  .on({
    '/products/list': function () { ... },
    '/products': function () { ... },
    ...
  })
  .resolve();
```

The order of routes adding do matter. The URL which is added earlier and matches wins. For example:

```js
router
  .on({
    'products/:id': function () {
      setContent('Products');
    },
    'products': function () {
      setContent('About');
    },
    '*': function () {
      setContent('Home')
    }
  })
  .resolve();
```

* Have in mind that the order of the added routes using this method [does not](https://github.com/krasimir/navigo/pull/39) matter anymore. However, if we add series of routes by calling `on` multiple times we should consider the order of the calls.

### Parameterized URLs:

```js
router
  .on('/user/:id/:action', function (params) {
    // If we have http://site.com/user/42/save as a url then
    // params.id = 42
    // params.action = save
  })
  .resolve();
```

### Accessing GET parameters

Every handler receives the GET parameters passed to the page.

```js
router
  .on('/user/:id/:action', function (params, query) {
    // If we have http://site.com/user/42/save?answer=42 as a url then
    // params.id = 42
    // params.action = save
    // query = answer=42
  })
  .resolve();
```

In the case of the default handler and `notFound` handler the function receives only `query` as parameter. For example:
```js
router.notFound(function (query) {
  // ...
});
```

### Using regular expression

```js
router
  .on(/users\/(\d+)\/(\w+)\/?/, function (id, action) {
    // If we have http://site.com/user/42/save as a url then
    // id = 42
    // action = save
  })
  .resolve();
```

Wild card is also supported:

```js
router
  .on('/user/*', function () {
    // This function will be called on every
    // URL that starts with /user
  })
  .resolve();
```

*Have in mind that every call of `on` do not trigger a route check (anymore). You have to run `resolve` method manually to get the routing works.*

### Not-found handler

```js
router.notFound(function () {
  // called when there is path specified but
  // there is no route matching
});
```

### Changing the page

Use the `navigate` method:

```
router.navigate('/products/list');
```

You may also specify an absolute path. For example:

```
router.navigate('http://site.com/products/list', true);
```

If you want to bind page links to Navigo you have to add `data-navigo` attribute. For example:

```html
<a href="about" data-navigo>About</a>
```

*(Have in mind that you have to fire `updatePageLinks` every time when new links are placed on the page so Navigo does the binding for them.)*

It's translated to:

```js
// the html to: <a href="javascript:void(0);" data-navigo>About</a>
var location = link.getAttribute('href');
...
link.addEventListener('click', e => {
  e.preventDefault();
  router.navigate(location);
});
```

### Named routes

Use the following API to give a name to your route and later generate URLs:

```js
router = new Navigo('http://site.com/', true);
router.on({
  '/trip/:tripId/edit': { as: 'trip.edit', uses: handler },
  '/trip/save': { as: 'trip.save', uses: handler },
  '/trip/:action/:tripId': { as: 'trip.action', uses: handler }
});
console.log(router.generate('trip.edit', { tripId: 42 })); // --> /trip/42/edit
console.log(router.generate('trip.action', { tripId: 42, action: 'save' })); // --> /trip/save/42
console.log(router.generate('trip.save')); // --> /trip/save
```

### Resolving the routes

The resolving of the routes happen when `resolve` method is fired which happen:

* if you manually run `router.resolve()`
* every time when the page's URL changes
* if you call `navigate`

### Pausing the router

[Sometimes](https://github.com/krasimir/navigo/issues/18) you need to update the URL but you don't want to resolve your callbacks. In such cases you may call `.pause()` and do `.navigate('new/url/here')`. For example:

```js
r.pause();
r.navigate('/en/products');
r.resume(); // or .pause(false)
```

The route will be changed to `/en/products` but if you have a handler for that path will not be executed.

### Hooks

There is an API that allows you to run functions before firing a route handler. The `hooks` object is in the format of:

```
{
  before: function (done) { ... done(); },
  after: function () { ... }
}
```

You may specify only one (or both) hooks. The `before` hook accepts a function which you *must* invoke once you finish your job. Here is an examples:

```
router.on(
  '/user/edit',
  function () {
    // show user edit page
  },
  {
    before: function (done) {
      // doing some async operation
      done();
    },
    after: function () {
      console.log('Data saved.');
    }
  }
);
```

You may prevent the handler to be resolved in the `before` hook by invoking `done(false)`:

```
router.on(
  '/user/edit',
  function () {
    // show user edit page
  },
  {
    before: function (done) {
      if(!user.loggedIn) {
        done(false);
      } else {
        done()
      }
    }
  }
);
```

You may provide hooks in two other cases:

* While specifying a main/root handler `router.on(function() { ... }, hooks)`
* While specifying a not-found page handler `router.notFound(function() { ... }, hooks)`

## API

* `router.on(function)` - adding handler for root/main route
* `router.on(string, function)` - adding a new route
* `router.on(object)` - adding a new route
* `router.off(handler)` - removes the routes associated with the given handler/function
* `router.navigate(path='', absolute=false)` - if `absolute` is `false` then Navigo finds the root path of your app based on the provided routes.
* `router.resolve(currentURL=undefined)` - if `currentURL` is provided then the method tries resolving the registered routes to that URL and not `window.location.href`.
* `router.destroy` - removes all the registered routes and stops the URL change listening.
* `router.link(path)` - it returns a full url of the given `path`
* `router.pause(boolean)` - it gives you a chance to change the route without resolving. Make sure that you call `router.pause(false)` so you return to the previous working state.
* `router.disableIfAPINotAvailable()` - well, it disables the route if History API is not supported
* `router.updatePageLinks()` - it triggers the `data-navigo` links binding process
* `router.notFound(function)` - adding a handler for not-found URL (404 page)
* `router.lastRouteResolved()` - returns an object with the format of `{ url: <string>, query: <string> }` matching the latest resolved route

There are couple of static properties. You'll probably never need to touch them but here're they:

```
Navigo.PARAMETER_REGEXP = /([:*])(\w+)/g;
Navigo.WILDCARD_REGEXP = /\*/g;
Navigo.REPLACE_VARIABLE_REGEXP = '([^\/]+)';
Navigo.REPLACE_WILDCARD = '(?:.*)';
Navigo.FOLLOWED_BY_SLASH_REGEXP = '(?:\/$|$)';
Navigo.MATCH_REGEXP_FLAGS = '';
```

`Navigo.MATCH_REGEXP_FLAGS` could be useful when you want a case insensitive route matching. Simple use `Navigo.MATCH_REGEXP_FLAGS = 'i'`.

## Tests

```
npm i
npm test
// or npm run test-chrome
// or npm run test-firefox
```

## Inspiration

* [A modern JavaScript router in 100 lines](http://krasimirtsonev.com/blog/article/A-modern-JavaScript-router-in-100-lines-history-api-pushState-hash-url)

## TODO

* A general handler for when Navigo matches some of the rules
