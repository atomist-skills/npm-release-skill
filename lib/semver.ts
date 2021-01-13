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

import * as semver from "semver";

/**
 * Return true if provided tag is a release semantic version.
 */
export function isReleaseSemVer(tag: string): boolean {
	if (!tag) {
		return false;
	}
	const sv = semver.parse(tag);
	if (!sv || sv.prerelease?.length > 0 || sv.build?.length > 0) {
		return false;
	}
	return true;
}

/**
 * Return true if provided tag is a prerelease semantic version.
 */
export function isPreReleaseSemVer(tag: string): boolean {
	if (!tag) {
		return false;
	}
	const sv = semver.parse(tag);
	if (!sv || sv.build?.length > 0) {
		return false;
	}
	return sv.prerelease?.length > 0;
}

/**
 * Clean up the tag, returning just the semantic version.
 */
export function cleanSemVer(tag: string): string {
	return semver.clean(tag);
}

/**
 * Return a function that tags a tag and returns true if tag is a
 * pre-release semantic version matching the provided release semantic
 * version.
 */
function isMatchingPreReleaseSemVer(release: string): (t: string) => boolean {
	const releaseRegExp = new RegExp(`^v?${release}-`);
	return (t: string): boolean => {
		return releaseRegExp.test(t);
	};
}

/**
 * Return subset of tags that are pre-release semantic versions
 * matching the provided release semantic version.
 */
export function matchingPreReleaseSemVers(
	release: string,
	tags: string[],
): string[] {
	return tags.filter(isMatchingPreReleaseSemVer(release));
}

/**
 * Return latest tag that is a prerelease version less than the
 * release. Return `undefined` if no suitable tag is found.
 */
export function bestPreReleaseSemVer(
	release: string,
	tags: string[],
): string | undefined {
	return tags
		.filter(isPreReleaseSemVer)
		.filter(t => semver.lt(t, release))
		.sort(semver.compare)
		.pop();
}
