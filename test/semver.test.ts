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

import {
	bestPreReleaseSemVer,
	cleanSemVer,
	isPreReleaseSemVer,
	isReleaseSemVer,
	matchingPreReleaseSemVers,
} from "../lib/semver";

describe("semver", () => {
	describe("isReleaseSemVer", () => {
		it("matches release semantic versions", () => {
			const vs = ["1.2.3", "v1.2.4", "0.0.0", "v12312.456456456.7897897"];
			vs.forEach(v => assert(isReleaseSemVer(v)));
		});

		it("does not match non-release semantic versions", () => {
			const vs = [
				undefined,
				"",
				"1.2.3-0",
				"vv1.2.4",
				"0.00.0",
				"v12312.456456456.7897897-text.1.2.3",
				"not-a-version-at-all",
				"1.2.3.",
			];
			vs.forEach(v => assert(!isReleaseSemVer(v)));
		});

		it("does not match semantic versions with build metadata", () => {
			const vs = [
				"1.2.3+b.3",
				"v1.2.4+build.897",
				"0.0.0+b0",
				"v12312.456456456.7897897+bb-8",
			];
			vs.forEach(v => assert(!isReleaseSemVer(v)));
		});
	});

	describe("isPreReleaseSemVer", () => {
		it("matches prerelease semantic versions", () => {
			const vs = [
				"1.2.3-pre.0",
				"v1.2.4-x.y.z",
				"0.0.0-0",
				"v12312.456456456.7897897-123423-12342344",
			];
			vs.forEach(v => assert(isPreReleaseSemVer(v)));
		});

		it("does not match non-prerelease semantic versions", () => {
			const vs = [
				undefined,
				"",
				"1.2.3",
				"vv1.2.4-0",
				"0.0.0-00",
				"v12312.456456456.7897897text.1.2.3",
				"not-a-version-at-all",
				"1.2-3",
			];
			vs.forEach(v => assert(!isPreReleaseSemVer(v)));
		});

		it("does not match semantic versions with build metadata", () => {
			const vs = [
				"1.2.3-pre.0+b.1",
				"v1.2.4-x.y.z+build.x",
				"0.0.0-0+bb8",
				"v12312.456456456.7897897-123423-12342344+m.1",
			];
			vs.forEach(v => assert(!isPreReleaseSemVer(v)));
		});
	});

	describe("cleanSemVer", () => {
		it("cleans semantic version", () => {
			const vs = [
				{ t: "1.2.3", v: "1.2.3" },
				{ t: "v1.2.4", v: "1.2.4" },
				{ t: "v0.0.0-a000", v: "0.0.0-a000" },
				{ t: "v12312.456456456.7897897", v: "12312.456456456.7897897" },
			];
			vs.forEach(v => assert(cleanSemVer(v.t) === v.v));
		});
	});

	describe("matchingPreReleaseSemanticVersions", () => {
		it("finds matching pre-release semantic versions", () => {
			const vs = [
				{ r: "1.2.3", t: ["no", "1.2.2-x", "1.2.3-y"], e: ["1.2.3-y"] },
				{ r: "1.2.4", t: ["v1.2.4", "no"], e: [] },
				{
					r: "3.2.1",
					t: ["v3.2.1.0-z", "v3.2.1-0-abcdef", "v3.2.1"],
					e: ["v3.2.1-0-abcdef"],
				},
				{
					r: "7.4.1",
					t: ["v7.4.1-0", "v7.4.1-1", "7.4.1-2", "v7.4.1"],
					e: ["v7.4.1-0", "v7.4.1-1", "7.4.1-2"],
				},
			];
			vs.forEach(v =>
				assert.deepStrictEqual(
					matchingPreReleaseSemVers(v.r, v.t),
					v.e,
				),
			);
		});
	});

	describe("bestPreReleaseSemVer", () => {
		it("finds best prerelease semantic version", () => {
			const vs = [
				{ r: "1.2.3", t: ["no", "1.2.2-x", "1.2.3-y"], e: "1.2.3-y" },
				{
					r: "1.2.4",
					t: ["v1.2.4", "1.2.5-pre.0", "no"],
					e: undefined,
				},
				{
					r: "3.2.1",
					t: ["v3.2.1.0-z", "v3.2.1-0-abcdef", "v3.2.1"],
					e: "v3.2.1-0-abcdef",
				},
				{
					r: "v7.4.1",
					t: ["v7.4.1-0", "v7.4.1-1", "7.4.1-2", "v7.4.1"],
					e: "7.4.1-2",
				},
				{ r: "1.2.3", t: ["no", "1.2.2-x", "1.2.1-y"], e: "1.2.2-x" },
				{ r: "1.2.3", t: [], e: undefined },
				{ r: "1.2.3", t: [undefined, ""], e: undefined },
				{
					r: "1.0.0",
					t: ["no", "0.2.2-x", "0.4.1-y", "0.5.0"],
					e: "0.4.1-y",
				},
			];
			vs.forEach(v => assert(bestPreReleaseSemVer(v.r, v.t) === v.e));
		});
	});
});
