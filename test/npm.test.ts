/*
 * Copyright © 2021 Atomist, Inc.
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

import { log } from "@atomist/skill";
import * as assert from "power-assert";

import { npmPackageVersions, removeScheme } from "../lib/npm";

describe("npm", () => {
	describe("npmPackageVersions", () => {
		let originalLogDebug: any;
		before(() => {
			originalLogDebug = Object.getOwnPropertyDescriptor(log, "debug");
			Object.defineProperty(log, "debug", {
				value: () => {
					return;
				},
			});
		});
		after(() => {
			Object.defineProperty(log, "debug", originalLogDebug);
		});

		it("gets versions for this package", async () => {
			const v = await npmPackageVersions("@atomist/npm-release-skill");
			const e = ["0.1.1-110"];
			assert.deepStrictEqual(v, e);
		}).timeout(5000);
	});

	describe("removeScheme", () => {
		it("removes the scheme", () => {
			const uhs = [
				{ u: "https://npm.foo.bar/", h: "//npm.foo.bar/" },
				{ u: "https://npm.foo.bar//", h: "//npm.foo.bar/" },
				{ u: "https://npm.foo.bar/baz", h: "//npm.foo.bar/baz/" },
				{ u: "https://npm.foo.bar/baz/", h: "//npm.foo.bar/baz/" },
				{
					u: "https://npm.foo.bar/baz/qux",
					h: "//npm.foo.bar/baz/qux/",
				},
				{
					u: "https://npm.foo.bar/baz/qux/",
					h: "//npm.foo.bar/baz/qux/",
				},
				{ u: "http://npm.foo.bar/", h: "//npm.foo.bar/" },
			];
			uhs.forEach(uh => assert(removeScheme(uh.u) === uh.h));
		});
	});
});
