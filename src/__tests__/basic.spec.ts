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
    it("should still update the browser URL", () => {
      const warn = jest.spyOn(console, "warn");
      warn.mockImplementationOnce(() => {});
      const push = jest.spyOn(history, "pushState");
      const r: NavigoRouter = new Navigo("/");
      r.navigate("/foo");

      expect(push).toBeCalledTimes(1);
      expect(push).toBeCalledWith({}, "", "/foo");

      warn.mockRestore();
      push.mockRestore();
    });
    it("should flush the `current`", () => {
      const warn = jest.spyOn(console, "warn");
      warn.mockImplementation(() => {});
      const r: NavigoRouter = new Navigo("/");
      r.on("/foo", () => {});
      r.navigate("/foo");

      expect(r.lastResolved()).toEqual(expect.objectContaining({ url: "foo" }));
      expect(r.current).toEqual(expect.objectContaining({ url: "foo" }));

      r.navigate("/bar");

      expect(r.lastResolved()).toEqual(null);
      expect(r.current).toEqual(null);

      warn.mockRestore();
    });
    it("should call the leave hook of the last matched one", () => {
      const warn = jest.spyOn(console, "warn");
      warn.mockImplementation(() => {});
      const r: NavigoRouter = new Navigo("/");
      const leaveHook = jest.fn().mockImplementation((done) => done());
      r.on("/foo", () => {}, { leave: leaveHook });
      r.navigate("/foo");
      r.navigate("/bar");
      expect(leaveHook).toBeCalledTimes(1);
      expect(leaveHook).toBeCalledWith(
        expect.any(Function),
        expect.objectContaining({ url: "foo" })
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
});
