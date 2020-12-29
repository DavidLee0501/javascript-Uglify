import NavigoRouter from "../../index";
import Navigo from "../index";
import Q from "../Q";

describe("Given the Navigo library", () => {
  beforeEach(() => {
    history.pushState({}, "", "/");
  });
  describe("when creating a router", () => {
    it("should accept just a function to the `on` method", () => {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/foo");
      router.on(handler);
      expect(router.routes).toStrictEqual([
        { path: "foo/foo", handler, hooks: undefined, name: "foo/foo" },
      ]);
    });
    it("should accept path and a function", () => {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/foo");
      router.on("/bar", handler);
      expect(router.routes).toStrictEqual([
        { path: "foo/bar", handler, hooks: undefined, name: "foo/bar" },
      ]);
    });
    it("should accept path as RegExp and a function", () => {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/foo");
      router.on(/^b/, handler);
      expect(router.routes).toStrictEqual([
        { path: /^b/, handler, hooks: undefined, name: "/^b/" },
      ]);
    });
    it("should accept object with paths and handlers", () => {
      const handler = jest.fn();
      const router: NavigoRouter = new Navigo("/foo");
      router.on({
        a: handler,
        b: handler,
      });
      expect(router.routes).toStrictEqual([
        { path: "foo/a", handler, hooks: undefined, name: "foo/a" },
        { path: "foo/b", handler, hooks: undefined, name: "foo/b" },
      ]);
    });
    it("should allow chaining of the `on` method", () => {
      const router: NavigoRouter = new Navigo("/");
      router.on("foo", () => {}).on("bar", () => {});
      expect(router.routes).toHaveLength(2);
    });
    it("should start listening to the popstate event", () => {
      const add = jest.spyOn(window, "addEventListener");
      const r: NavigoRouter = new Navigo("/");

      expect(add).toBeCalledWith("popstate", expect.any(Function));
      add.mockRestore();
    });
    describe('and when using "named routes"', () => {
      it("should allow us to define routes", () => {
        const r: NavigoRouter = new Navigo("/");
        const handler = jest.fn();
        const hook = jest.fn().mockImplementation((done) => {
          done();
        });

        r.on({
          "/foo": { as: "my foo", uses: handler, hooks: { before: hook } },
          "/bar": { as: "my bar", uses: handler },
        });

        r.resolve("foo");
        r.resolve("bar");

        expect(handler).toBeCalledTimes(2);
        expect(handler).toBeCalledWith(
          expect.objectContaining({
            route: expect.objectContaining({ name: "my foo" }),
          })
        );
        expect(handler).toBeCalledWith(
          expect.objectContaining({
            route: expect.objectContaining({ name: "my bar" }),
          })
        );
        expect(r.lastResolved()).toStrictEqual({
          data: null,
          params: null,
          queryString: "",
          route: {
            handler: expect.any(Function),
            hooks: undefined,
            name: "my bar",
            path: "bar",
          },
          url: "bar",
        });
        expect(hook).toBeCalledTimes(1);
      });
      it("should allow us to generate a URL out of the named route", () => {
        const r: NavigoRouter = new Navigo("/");
        const handler = jest.fn();

        r.on({
          "/foo/:id/:action": { as: "my foo", uses: handler },
        });

        expect(r.generate("my foo", { id: "xxx", action: "save" })).toEqual(
          "/foo/xxx/save"
        );
      });
    });
    it("should create an instance of Route for each route and Match+Route if there is matching paths", () => {
      const r: NavigoRouter = new Navigo("/");
      r.on("/about/", () => {})
        .on(() => {})
        .resolve("/about?a=b");

      expect(r.routes).toStrictEqual([
        {
          name: "about",
          path: "about",
          hooks: undefined,
          handler: expect.any(Function),
        },
        {
          name: "",
          path: "",
          hooks: undefined,
          handler: expect.any(Function),
        },
      ]);
      expect(r.lastResolved()).toStrictEqual({
        data: null,
        params: { a: "b" },
        queryString: "a=b",
        route: {
          name: "about",
          path: "about",
          hooks: undefined,
          handler: expect.any(Function),
        },
        url: "about",
      });
    });
  });
  describe("when using the clean helper function", () => {
    it("should remove the slashes from the beginning and end of the string", () => {
      const clean = new Navigo("/")._clean;
      [
        ["", ""],
        ["foo", "foo"],
        ["/foo", "foo"],
        ["//foo", "foo"],
        ["///foo", "foo"],
        ["foo/", "foo"],
        ["foo//", "foo"],
        ["foo///", "foo"],
        ["/foo/", "foo"],
        ["/foo//", "foo"],
        ["/foo/bar/", "foo/bar"],
        ["/", ""],
      ].forEach(([i, out]) => {
        expect(clean(i)).toEqual(out);
      });
    });
  });
  describe("when matching a route", () => {
    [
      [
        "",
        "",
        {
          data: null,
          params: null,
        },
      ],
      ["", "/foo/bar", false],
      [
        "/foo/bar",
        "/foo/bar",
        {
          data: null,
          params: null,
          url: "foo/bar",
        },
      ],
      [
        "/foo/bar",
        "/foo/bar/",
        {
          data: null,
          params: null,
        },
      ],
      ["/foo/bar", "/foo/moo", false],
      [
        "/foo/bar",
        "/foo/:name",
        {
          data: { name: "bar" },
          params: null,
        },
      ],
      [
        "/foo/a/b",
        "/foo/:id/:name",
        {
          data: { id: "a", name: "b" },
          params: null,
        },
      ],
      [
        "/foo/a/b?m=n&k=z",
        "/foo/:id/:name",
        {
          data: { id: "a", name: "b" },
          params: { m: "n", k: "z" },
          queryString: "m=n&k=z",
        },
      ],
      [
        "/foo/a/b?zzz=%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0&building=Empire%20State%20Building%26something&animal=bear&",
        "/foo/:id/:name",
        {
          data: { id: "a", name: "b" },
          params: {
            animal: "bear",
            building: "Empire State Building&something",
            zzz: "оставка",
          },
        },
      ],
      [
        "/foo/a/b?m=n&k=z&k=y",
        "/foo/:id/:name",
        {
          data: { id: "a", name: "b" },
          params: { m: "n", k: ["z", "y"] },
        },
      ],
      [
        "/yes-it-works/",
        ":foo",
        {
          data: { foo: "yes-it-works" },
          params: null,
        },
      ],
      [
        "/foo/a/b?m=n",
        "/foo/*",
        {
          data: null,
          params: { m: "n" },
        },
      ],
      [
        "/foo/a/b?m=n",
        "*",
        {
          data: null,
          params: { m: "n" },
        },
      ],
      ["/foo/user/action/save", "/foo/user", false],
      ["/foo/user", "/foo/user/action/save", false],
      ["/noo", "/", false],
      ["/", "/", { data: null, params: null, url: "" }],
      ["/rock/paper/scissors/", "/:moduleName", false],
      [
        "/rock/paper/scissors",
        /rock\/(.*)\/(.*)/,
        { data: ["paper", "scissors"] },
      ],
      ["/rock/?a=b&c=d", "/rock", { data: null, params: { a: "b", c: "d" } }],
    ].forEach(([location, path, expectedResult, only]) => {
      const f = only ? fit : it;
      f(
        `should ${
          expectedResult ? "match" : "not match"
        } when we have "${location}" as location and "${path}" as route path`,
        () => {
          const router: NavigoRouter = new Navigo("/");
          // @ts-ignore
          router.on(path, () => {});
          // @ts-ignore
          expect(router.match(location as string))[
            typeof expectedResult === "boolean" ? "toEqual" : "toMatchObject"
          ](expectedResult);
        }
      );
    });
    it("should provide an API for direct matching of the routes", () => {
      const r: NavigoRouter = new Navigo("/");

      r.on("/foo", () => {});
      r.on("/user/:id", () => {});

      expect(r.match("/nope")).toEqual(false);
      expect(r.match("/user/xxx/?a=b")).toStrictEqual({
        data: {
          id: "xxx",
        },
        params: { a: "b" },
        queryString: "a=b",
        route: {
          handler: expect.any(Function),
          hooks: undefined,
          name: "user/:id",
          path: "user/:id",
        },
        url: "user/xxx",
      });
    });
  });
  describe("when we have a no matching route", () => {
    it("should log a warning and return false", () => {
      const warn = jest.spyOn(console, "warn");
      warn.mockImplementationOnce(() => {});
      const r: NavigoRouter = new Navigo("/");
      const res = r.resolve();

      expect(res).toEqual(false);
      expect(warn).toBeCalledWith(
        `Navigo: "/" didn't match any of the registered routes.`
      );
      warn.mockRestore();
    });
  });
  describe("when resolving a route", () => {
    it("should call our handler", () => {
      const r: NavigoRouter = new Navigo("/");
      const handler = jest.fn();
      r.on("foo/:id", handler);
      r.on("foo/xxx-yyy-zzz", handler);
      r.resolve("/foo/xxx-yyy-zzz");

      expect(handler).toBeCalledTimes(1);
      expect(handler).toBeCalledWith({
        data: { id: "xxx-yyy-zzz" },
        params: null,
        route: expect.any(Object),
        url: expect.any(String),
        queryString: expect.any(String),
      });
    });
    it("should take into account the order of the routes definition", () => {
      const r: NavigoRouter = new Navigo("/");
      const handlerA = jest.fn();
      const handlerB = jest.fn();

      r.on("foo/bar", handlerA);
      r.on("foo/*", handlerB);

      r.resolve("/foo/bar");
      r.resolve("/foo/moo");

      expect(handlerA).toBeCalledTimes(1);
      expect(handlerB).toBeCalledTimes(1);
    });
    it("should call the handler once if the matched route is the same", () => {
      const r: NavigoRouter = new Navigo("/");
      const handler = jest.fn();

      r.on("foo/:id", handler);

      r.resolve("/foo/bar");
      r.resolve("/foo/moo");
      r.resolve("/foo/moo");
      r.resolve("/foo/moo?a=10");

      expect(handler).toBeCalledTimes(3);
      expect(handler.mock.calls[0][0]).toMatchObject({
        data: { id: "bar" },
      });
      expect(handler.mock.calls[1][0]).toMatchObject({
        data: { id: "moo" },
      });
      expect(handler.mock.calls[2][0]).toMatchObject({
        data: { id: "moo" },
        params: { a: "10" },
      });
    });
  });
  describe("when using the `off` method", () => {
    it("should remove the handler from the routes", () => {
      const r: NavigoRouter = new Navigo("/");
      const h = () => {};
      r.on("/foo", () => {}).on("/bar", h);
      expect(r.routes).toHaveLength(2);
      r.off("foo").off(h);
      expect(r.routes).toHaveLength(0);
    });
    describe("and when the path is a RegExp", () => {
      it("should still work", () => {
        const r: NavigoRouter = new Navigo("/");
        const h = () => {};
        r.on(/foo/, () => {}).on(/bar/, h);
        expect(r.routes).toHaveLength(2);
        r.off(/foo/).off(h);
        expect(r.routes).toHaveLength(0);
      });
    });
  });
  describe("when destroying the router", () => {
    it("should empty the routes array and remove the listener to popstate", () => {
      const remove = jest.spyOn(window, "removeEventListener");
      const r: NavigoRouter = new Navigo("/");
      r.on("foo", () => {});

      r.destroy();

      expect(r.routes).toHaveLength(0);
      expect(remove).toBeCalledWith("popstate", expect.any(Function));
      expect(r.destroyed).toEqual(true);
    });
  });
  describe("when setting a not found handler", () => {
    it("should fallback to that route if no handler is found", () => {
      history.pushState({}, "", "/foo/bar?a=b");
      const r: NavigoRouter = new Navigo("/");
      const notFound = jest.fn();
      r.notFound(notFound).resolve();

      expect(notFound).toBeCalledWith({
        data: null,
        route: {
          handler: expect.any(Function),
          hooks: undefined,
          path: "foo/bar",
          name: "__NOT_FOUND__",
        },
        url: "foo/bar",
        queryString: "a=b",
        params: { a: "b" },
      });
    });
  });
  describe("when using the `link` method", () => {
    it("should return the composed url", () => {
      const r: NavigoRouter = new Navigo("/my/root");

      expect(r.link("something/else")).toEqual("/my/root/something/else");
    });
  });
  describe("when we set hooks as part of the route map", () => {
    it("should keep the hooks working", () => {
      const r: NavigoRouter = new Navigo("/");
      const handler = jest.fn();
      const beforeHook = jest.fn().mockImplementation((done) => done());

      r.on({
        "/foo/:id": {
          as: "some.name",
          uses: handler,
          hooks: {
            before: beforeHook,
          },
        },
      });

      r.resolve("/foo/100");

      expect(handler).toBeCalledTimes(1);
      expect(beforeHook).toBeCalledTimes(1);
    });
  });
  describe("when using the `before` hook", () => {
    it("should call the hook before resolving a handler", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const expectedMatch = {
        data: { id: "100" },
        params: { a: "b" },
        queryString: "a=b",
        route: expect.any(Object),
        url: "foo/100",
      };

      r.on("/foo/:id", h1, {
        before(done, match) {
          h2(match);
          done();
        },
      });

      r.resolve("/foo/100?a=b");

      expect(h2).toBeCalledWith(expectedMatch);
      expect(h1).toBeCalledWith(expectedMatch);
      expect(order).toStrictEqual([2, 1]);
    });
    it("should allow us to block the handler", () => {
      const r: NavigoRouter = new Navigo("/");
      const h1 = jest.fn();
      const h2 = jest.fn();

      r.on("/foo", h1, {
        before(done) {
          h2();
          done(false);
        },
      });

      r.resolve("/foo");

      expect(h2).toBeCalledTimes(1);
      expect(h1).not.toBeCalled();
    });
  });
  describe("when using the `after` hook", () => {
    it("should fire the hook when the handler is resolved", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const expectedMatch = {
        data: { id: "100" },
        params: { a: "b" },
        queryString: "a=b",
        route: expect.any(Object),
        url: "foo/100",
      };

      r.on("/foo/:id", h1, {
        after(match) {
          h2(match);
        },
      });

      r.resolve("/foo/100?a=b");

      expect(h2).toBeCalledWith(expectedMatch);
      expect(h1).toBeCalledWith(expectedMatch);
      expect(order).toStrictEqual([1, 2]);
    });
  });
  describe("when using the `leave` hook", () => {
    it("should fire the hook when we leave out of a route", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const h3 = jest.fn().mockImplementation(() => order.push(3));

      r.on("/foo/:id", h2)
        .on("/", h1, {
          leave(done, match) {
            h3(match);
            done();
          },
        })
        .resolve();

      r.resolve("/foo/100?a=b");

      expect(h1).toBeCalledWith(expect.objectContaining({ url: "" }));
      expect(h2).toBeCalledWith({
        data: { id: "100" },
        params: { a: "b" },
        queryString: "a=b",
        route: expect.any(Object),
        url: "foo/100",
      });
      expect(h3).toBeCalledWith({
        data: null,
        params: null,
        queryString: "",
        route: expect.any(Object),
        url: "",
      });
      expect(order).toStrictEqual([1, 3, 2]);
    });
    it("should allow us to block the leaving", () => {
      const r: NavigoRouter = new Navigo("/");
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      r.on("/nope", spy1, { leave: (done) => done(false) });
      r.on("/foo", spy2);
      r.on("/bar", spy2);
      r.on(spy2);
      r.navigate("/foo");
      r.navigate("/nope");
      r.navigate("/bar");
      r.navigate("/foo");
      r.navigate("/");

      expect(spy1).toBeCalledTimes(1);
      expect(spy1).toBeCalledWith(
        expect.objectContaining({
          url: "nope",
        })
      );
      expect(spy2).toBeCalledTimes(1);
      expect(spy2).toBeCalledWith(
        expect.objectContaining({
          url: "foo",
        })
      );
    });
    it("should not call pushState (or replaceState) if the leaving is blocked", () => {
      const pushState = jest.spyOn(window.history, "pushState");
      const r: NavigoRouter = new Navigo("/");
      const spy = jest.fn();

      r.on("/nope", spy, { leave: (done) => done(false) });
      r.on("/foo", spy);
      r.on("/bar", spy);
      r.on(spy);
      r.navigate("/nope");
      r.navigate("/bar");
      r.navigate("/foo");
      r.navigate("/");

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          url: "nope",
        })
      );
      expect(pushState).toBeCalledTimes(1);
      expect(pushState).toBeCalledWith({}, "", "/nope");
      pushState.mockRestore();
    });
  });
  describe("when using the `already` hook", () => {
    it("should fire the hook when we are matching the same handler", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const expectedMatch = {
        data: { id: "100" },
        params: { a: "b" },
        queryString: "a=b",
        route: expect.any(Object),
        url: "foo/100",
      };

      r.on("/foo/:id", h1, {
        already(match) {
          h2(match);
        },
      });

      r.resolve("/foo/100?a=b");
      r.resolve("/foo/100?a=b");

      expect(h2).toBeCalledWith(expectedMatch);
      expect(h1).toBeCalledWith(expectedMatch);
      expect(order).toStrictEqual([1, 2]);
    });
  });
  describe("when passing hooks to the default handler", () => {
    it("should use the hooks", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const h3 = jest.fn().mockImplementation(() => order.push(3));
      const expectedMatch = {
        data: null,
        params: null,
        queryString: "",
        route: expect.any(Object),
        url: "",
      };

      r.on(h1, {
        before(done, match) {
          h2(match);
          done();
        },
        after(match) {
          h3(match);
        },
      });

      r.resolve("/");

      expect(h1).toBeCalledWith(expectedMatch);
      expect(h2).toBeCalledWith(expectedMatch);
      expect(h3).toBeCalledWith(expectedMatch);
      expect(order).toStrictEqual([2, 1, 3]);
    });
  });
  describe("when passing hooks to the not found handler", () => {
    it("should use the hooks", () => {
      const r: NavigoRouter = new Navigo("/");
      const order = [];
      const h1 = jest.fn().mockImplementation(() => order.push(1));
      const h2 = jest.fn().mockImplementation(() => order.push(2));
      const h3 = jest.fn().mockImplementation(() => order.push(3));
      const expectedMatch = {
        data: null,
        params: null,
        queryString: "",
        route: expect.any(Object),
        url: "wat",
      };

      r.notFound(h1, {
        before(done, match) {
          h2(match);
          done();
        },
        after(match) {
          h3(match);
        },
      });

      r.resolve("/wat");

      expect(h1).toBeCalledWith(expectedMatch);
      expect(h2).toBeCalledWith(expectedMatch);
      expect(h3).toBeCalledWith(expectedMatch);
      expect(order).toStrictEqual([2, 1, 3]);
    });
  });
  describe("when using generic hooks", () => {
    it("should set the generic hooks to every registered route", () => {
      const r: NavigoRouter = new Navigo("/");
      const hooks = {
        before: jest.fn().mockImplementation((done) => {
          done();
        }),
        after: jest.fn(),
      };
      const h1 = jest.fn();
      const h2 = jest.fn();
      const h3 = jest.fn();

      r.hooks(hooks);

      r.notFound(h3);
      r.on("/foo/bar", h1);
      r.on("/", h2);

      r.resolve("/foo/bar");
      r.resolve("/");
      r.resolve("/noo");

      expect(hooks.before).toBeCalledTimes(3);
      expect(hooks.after).toBeCalledTimes(3);
      expect(h1).toBeCalledTimes(1);
      expect(h2).toBeCalledTimes(1);
      expect(h3).toBeCalledTimes(1);
    });
  });
  describe("when using `pathToMatchObject` method", () => {
    it("should convert a path to a Match object", () => {
      const r: NavigoRouter = new Navigo("/");
      r.hooks({
        leave: () => {},
      });
      expect(r._pathToMatchObject("/foo/bar?a=b")).toStrictEqual({
        data: null,
        params: { a: "b" },
        queryString: "a=b",
        route: {
          handler: expect.any(Function),
          hooks: {
            leave: expect.any(Function),
          },
          name: "foo/bar",
          path: "foo/bar",
        },
        url: "foo/bar",
      });
    });
  });
  describe("when using the `Q`", () => {
    it("should allow us to add functions and run them one after each other sharing the same context", () => {
      const context = { data: [] };
      Q(
        [
          (context, done) => {
            context.data.push("a");
            done();
          },
          (context, done) => {
            context.data.push("b");
            done();
          },
          (context, done) => {
            context.data.push("c");
            done();
          },
        ],
        context
      );
      expect(context.data).toStrictEqual(["a", "b", "c"]);
    });
    it("should allow us to block the Q", () => {
      const context = { data: [] };
      Q(
        [
          (context, done) => {
            context.data.push("a");
            done();
          },
          (context, done) => {
            context.data.push("b");
            done(false);
          },
          (context, done) => {
            context.data.push("c");
            done();
          },
        ],
        context
      );
      expect(context.data).toStrictEqual(["a", "b"]);
    });
    it("should allow us to conditionally control the content of the Q", () => {
      const context = { data: [], flag: true };
      Q(
        [
          (context, done) => {
            context.data.push("a");
            done();
          },
          (context, done) => {
            context.data.push("b");
            context.flag = false;
            done();
          },
          Q.if(
            (context) => context.flag,
            [
              (context, done) => {
                context.data.push("c");
                done();
              },
              (context, done) => {
                context.data.push("d");
                done();
              },
            ],
            [
              (context, done) => {
                context.data.push("e");
                done();
              },
              (context, done) => {
                context.data.push("f");
                done();
              },
            ]
          ),
          (context, done) => {
            context.data.push("z");
            done();
          },
        ],
        context
      );
      expect(context.data).toStrictEqual(["a", "b", "e", "f", "z"]);
    });
  });
});
