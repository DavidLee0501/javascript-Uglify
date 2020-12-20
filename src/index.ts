const PARAMETER_REGEXP = /([:*])(\w+)/g;
const WILDCARD_REGEXP = /\*/g;
const REPLACE_VARIABLE_REGEXP = "([^/]+)";
const REPLACE_WILDCARD = "(?:.*)";
const FOLLOWED_BY_SLASH_REGEXP = "(?:/$|$)";
const MATCH_REGEXP_FLAGS = "";

function clean(s: string) {
  return s.replace(/\/+$/, "").replace(/^\/+/, "");
}
function regExpResultToParams(match, names: string[]) {
  if (names.length === 0) return null;
  if (!match) return null;
  return match.slice(1, match.length).reduce((params, value, index) => {
    if (params === null) params = {};
    params[names[index]] = decodeURIComponent(value);
    return params;
  }, null);
}
function extractGETParameters(url: string) {
  const tmp = url.split(/\?(.*)?$/);
  return [tmp[0], tmp.slice(1).join("")];
}
function parseQuery(queryString: string): Object {
  var query = {};
  var pairs = queryString.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");
    if (pair[0] !== "") {
      let key = decodeURIComponent(pair[0]);
      if (!query[key]) {
        query[key] = decodeURIComponent(pair[1] || "");
      } else {
        if (!Array.isArray(query[key])) query[key] = [query[key]];
        query[key].push(decodeURIComponent(pair[1] || ""));
      }
    }
  }
  return query;
}
function matchRoute(currentPath: string, route: Route): false | Match {
  const [current, GETParams] = extractGETParameters(clean(currentPath));
  const paramNames = [];
  const regexp = new RegExp(
    clean(route.path)
      .replace(PARAMETER_REGEXP, function (full, dots, name) {
        paramNames.push(name);
        return REPLACE_VARIABLE_REGEXP;
      })
      .replace(WILDCARD_REGEXP, REPLACE_WILDCARD) + FOLLOWED_BY_SLASH_REGEXP,
    MATCH_REGEXP_FLAGS
  );
  const match = current.match(regexp);
  if (match) {
    return {
      url: current,
      queryString: GETParams,
      route: route,
      data: regExpResultToParams(match, paramNames),
      params: GETParams === "" ? null : parseQuery(GETParams),
    };
  }
  return false;
}
function pushStateAvailable(): boolean {
  return !!(
    typeof window !== "undefined" &&
    window.history &&
    window.history.pushState
  );
}

export default function Navigo(r?: string) {
  let root: string = "/";
  let current: Match = null;
  let routes: Route[] = [];
  let notFoundHandler: Function;
  const isPushStateAvailable = pushStateAvailable();
  const isWindowAvailable = typeof window !== "undefined";

  if (!r) {
    console.warn(
      'Navigo requires a root path in its constructor. If not provided will use "/" as default.'
    );
  } else {
    root = clean(r);
  }

  function getCurrentEnvURL(): string {
    if (isWindowAvailable) {
      return location.pathname + location.search + location.hash;
    }
    return root;
  }
  function on(path: string | Function | Object, handler?: Function) {
    if (typeof path === "object") {
      Object.keys(path).forEach((p) => this.on(p, path[p]));
      return this;
    } else if (typeof handler === "undefined") {
      handler = path as Function;
      path = root;
    }
    routes.push({ path: clean(path as string), handler });
    return this;
  }
  function resolve(currentLocationPath?: string): boolean | Match {
    if (typeof currentLocationPath === "undefined") {
      currentLocationPath = getCurrentEnvURL();
    }
    for (let i = 0; i < routes.length; i++) {
      const match: false | Match = matchRoute(currentLocationPath, routes[i]);
      if (match) {
        if (
          current &&
          current.route === routes[i] &&
          current.url === match.url &&
          current.queryString === match.queryString
        ) {
          return false;
        }
        current = match;
        routes[i].handler(match);
        return match;
      }
    }
    if (notFoundHandler) {
      const [url, queryString] = extractGETParameters(currentLocationPath);
      notFoundHandler({
        url,
        queryString,
        data: null,
        route: null,
        params: parseQuery(queryString),
      });
      return true;
    }
    console.warn(
      `Navigo: "${currentLocationPath}" didn't match any of the registered routes.`
    );
    return false;
  }
  function off(what: string | Function) {
    if (typeof what === "string") {
      this.routes = routes = routes.filter((r) => r.path !== what);
    } else {
      this.routes = routes = routes.filter((r) => r.handler !== what);
    }
    return this;
  }
  function navigate(to: string, options: NavigateTo = {}): void {
    to = `${clean(root)}/${clean(to)}`;
    if (isPushStateAvailable) {
      history[options.historyAPIMethod || "pushState"](
        options.stateObj || {},
        options.title || "",
        to
      );
    } else if (isWindowAvailable) {
      window.location.href = to;
    }
    resolve();
  }
  function listen() {
    if (isPushStateAvailable) {
      this.__popstateListener = () => {
        resolve();
      };
      window.addEventListener("popstate", this.__popstateListener);
    }
  }
  function destroy() {
    this.routes = routes = [];
    if (isPushStateAvailable) {
      window.removeEventListener("popstate", this.__popstateListener);
    }
  }
  function notFound(handler) {
    notFoundHandler = handler;
    return this;
  }

  this.routes = routes;
  this.on = on;
  this.off = off;
  this.resolve = resolve;
  this.navigate = navigate;
  this.destroy = destroy;
  this.notFound = notFound;
  this._matchRoute = matchRoute;
  this._clean = clean;

  listen.call(this);
}
