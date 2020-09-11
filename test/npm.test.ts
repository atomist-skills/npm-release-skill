/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "power-assert";
import { extractHostFromUrl } from "../lib/npm";

describe("npm", () => {
	describe("extractHostFromUrl", () => {
		it("finds the host", () => {
			const uhs = [
				{ u: "https://npm.foo.bar/", h: "npm.foo.bar" },
				{ u: "https://npm.foo.bar//", h: "npm.foo.bar" },
				{ u: "https://npm.foo.bar/baz", h: "npm.foo.bar" },
				{ u: "https://npm.foo.bar/baz/", h: "npm.foo.bar" },
				{ u: "https://npm.foo.bar/baz/qux", h: "npm.foo.bar" },
				{ u: "https://npm.foo.bar/baz/qux/", h: "npm.foo.bar" },
				{ u: "http://npm.foo.bar/", h: "npm.foo.bar" },
			];
			uhs.forEach(uh => assert(extractHostFromUrl(uh.u) === uh.h));
		});
	});
});
