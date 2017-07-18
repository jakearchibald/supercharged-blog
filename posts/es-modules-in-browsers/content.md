ES modules are starting to land in browsers! They're in…

* Safari 10.1.
* Chrome Canary 60 – behind the Experimental Web Platform flag in `chrome:flags`.
* Firefox 54 – behind the `dom.moduleScripts.enabled` setting in `about:config`.
* Edge 15 – behind the Experimental JavaScript Features setting in `about:flags`.

```html
<script type="module">
  import {addTextToBody} from './utils.js';

  addTextToBody('Modules are pretty cool.');
</script>
```

```js
// utils.js
export function addTextToBody(text) {
  const div = document.createElement('div');
  div.textContent = text;
  document.body.appendChild(div);
}
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/a298d5af601982c338186cd355e624a8/raw/aaa2cbee9a5810d14b01ae965e52ecb9b2965a44/)**.

All you need is `type=module` on the script element, and the browser will treat the inline or external script as an ECMAScript module.

There are already some [great articles on modules](https://ponyfoo.com/articles/es6-modules-in-depth), but I wanted to share a few browser-specific things I'd learned while testing & reading the spec:

# "Bare" import specifiers aren't currently supported

```js
// Supported:
import {foo} from 'https://jakearchibald.com/utils/bar.js';
import {foo} from '/utils/bar.js';
import {foo} from './bar.js';
import {foo} from '../bar.js';

// Not supported:
import {foo} from 'bar.js';
import {foo} from 'utils/bar.js';
```

Valid module specifiers must match one of the following:

* A full non-relative URL. As in, it doesn't throw an error when put through `new URL(moduleSpecifier)`.
* Starts with `/`.
* Starts with `./`.
* Starts with `../`.

Other specifiers are reserved for future-use, such as importing built-in modules.

# nomodule for backwards compatibility

```html
<script type="module" src="module.js"></script>
<script nomodule src="fallback.js"></script>
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/6110fb6df717ebca44c2e40814cc12af/raw/7fc79ed89199c2512a4579c9a3ba19f72c219bd8/)**.

Browsers that understand `type=module` should ignore scripts with a `nomodule` attribute. This means you can serve a module tree to module-supporting browsers while providing a fall-back to other browsers.

## Browser issues

* <del>Firefox doesn't support `nomodule` ([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1330900))</del>. Fixed in Firefox nightly!
* Edge doesn't support `nomodule` ([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10525830/)).
* Safari 10.1 doesn't support `nomodule`, but it's fixed in their latest technical preview. For 10.1, there's a [pretty smart workaround](https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc).

# Defer by default

```html
<!-- This script will execute after… -->
<script type="module" src="1.js"></script>

<!-- …this script… -->
<script src="2.js"></script>

<!-- …but before this script. -->
<script defer src="3.js"></script>
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/d6808ea2665f8b3994380160dc2c0bc1/raw/c0a194aa70dda1339c960c6f05b2e16988ee66ac/)**. The order should be `2.js`, `1.js`, `3.js`.

The way scripts block the HTML parser during fetching is baaaad. With regular scripts you can use `defer` to prevent blocking, which also delays script execution until the document has finished parsing, and maintains execution order with other deferred scripts. Module scripts behave like `defer` by default – there's no way to make a module script block the HTML parser while it fetches.

Module scripts use the same execution queue as regular scripts using `defer`.

# Inline scripts are also deferred

```html
<!-- This script will execute after… -->
<script type="module">
  addTextToBody("Inline module executed");
</script>

<!-- …this script… -->
<script src="1.js"></script>

<!-- …and this script… -->
<script defer>
  addTextToBody("Inline script executed");
</script>

<!-- …but before this script. -->
<script defer src="2.js"></script>
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/7026f72c0675898196f7669699e3231e/raw/fc7521aabd9485f30dbd5189b407313cd350cf2b/)**. The order should be `1.js`, inline script, inline module, `2.js`.

Regular inline scripts ignore `defer` whereas inline module scripts are always deferred, whether they import anything or not.

# Async works on external & inline modules

```html
<!-- This executes as soon as its imports have fetched -->
<script async type="module">
  import {addTextToBody} from './utils.js';

  addTextToBody('Inline module executed.');
</script>

<!-- This executes as soon as it & its imports have fetched -->
<script async type="module" src="1.js"></script>
```

**[Live demo](https://module-script-tests-rgjnxtrtqq.now.sh/async)**. The fast-downloading scripts should execute before the slow ones.

As with regular scripts, `async` causes the script to download without blocking the HTML parser and executes as soon as possible. Unlike regular scripts, `async` also works on inline modules.

As always with `async`, scripts may not execute in the order they appear in the DOM.

## Browser issues

* Firefox doesn't support `async` on inline module scripts ([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1361369)).

# Modules only execute once

```html
<!-- 1.js only executes once -->
<script type="module" src="1.js"></script>
<script type="module" src="1.js"></script>
<script type="module">
  import "./1.js";
</script>

<!-- Whereas normal scripts execute multiple times -->
<script src="2.js"></script>
<script src="2.js"></script>
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/f7f6d37ef1b4d8a4f908f3e80d50f4fe/raw/1fcedde007a2b90049a7ea438781aebe69e22762/)**.

If you understand ES modules, you'll know you can import them multiple times but they'll only execute once. Well, the same applies to script modules in HTML – a module script of a particular URL will only execute once per page.

## Browser issues

* Edge executes modules multiple times ([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865922/)).

# Always CORS

```html
<!-- This will not execute, as it fails a CORS check -->
<script type="module" src="https://….now.sh/no-cors"></script>

<!-- This will not execute, as one of its imports fails a CORS check -->
<script type="module">
  import 'https://….now.sh/no-cors';

  addTextToBody("This will not execute.");
</script>

<!-- This will execute as it passes CORS checks -->
<script type="module" src="https://….now.sh/cors"></script>
```

**[Live demo](https://cdn.rawgit.com/jakearchibald/2b8d4bc7624ca6a2c7f3c35f6e17fe2d/raw/fe04e60b0b7021f261e79b8ef28b0ccd132c1585/)**.

Unlike regular scripts, module scripts (and their imports) are fetched with CORS. This means cross-origin module scripts must return valid CORS headers such as `Access-Control-Allow-Origin: *`.

## Browser issues

* Firefox fails to load the demo page ([issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1361373)).
* Edge loads module scripts without CORS headers ([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865934/)).

# No credentials

```html
<!-- Fetched with credentials (cookies etc) -->
<script src="1.js"></script>

<!-- Fetched without credentials -->
<script type="module" src="1.js"></script>

<!-- Fetched with credentials -->
<script type="module" crossorigin src="1.js?"></script>

<!-- Fetched without credentials -->
<script type="module" crossorigin src="https://other-origin/1.js"></script>

<!-- Fetched with credentials-->
<script type="module" crossorigin="use-credentials" src="https://other-origin/1.js?"></script>
```

**[Live demo](https://module-script-tests-zoelmqooyv.now.sh/cookie-page)**.

Most CORS-based APIs will send credentials (cookies etc) if the request is to the same origin, but `fetch()` and module scripts are exceptions – they don't send credentials unless you ask for them.

You can add credentials to a same-origin module by including the `crossorigin` attribute (which seems a bit weird to me, and [I've questioned this in the spec](https://github.com/whatwg/html/issues/2557)). If you want to send credentials to other origins too, use `crossorigin="use-credentials"`. Note that the other origin will have to respond with the `Access-Control-Allow-Credentials: true` header.

Also, there's a gotcha related to the "Modules only execute once" rule. Modules are keyed by their URL, so if you request a module without credentials, then request it with credentials, you'll get the same without-credentials module back. This is why I've used a `?` in the URLs above, to make them unique.

## Browser issues

* Chrome requests same-origin modules with credentials ([issue](https://bugs.chromium.org/p/chromium/issues/detail?id=717525)).
* Safari requests same-origin modules without credentials even if you use the `crossorigin` attribute ([issue](https://bugs.webkit.org/show_bug.cgi?id=171550)).
* Edge gets this backwards. It sends credentials to the same origin by default, but then *doesn't* send them if you add the `crossorigin` attribute ([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865956/)).

Firefox is the only one that gets this right – well done folks!

# Mime-types

Unlike regular scripts, modules scripts must be served with one of the [valid JavaScript MIME types](https://html.spec.whatwg.org/multipage/scripting.html#javascript-mime-type) else they won't execute.

**[Live demo](https://module-script-tests-zoelmqooyv.now.sh/mime)**.

## Browser issues

* Edge executes scripts with invalid MIME types ([issue](https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865977/)).

And that's what I've learned so far. Needless to say I'm really excited about ES modules landing in browsers!