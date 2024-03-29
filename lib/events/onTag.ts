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

import {
	EventHandler,
	log,
	repository,
	secret,
	status,
	subscription,
} from "@atomist/skill";
import * as fs from "fs-extra";
import * as semver from "semver";

import { NpmReleaseConfiguration } from "../configuration";
import { npmPackageVersions, prepareNpmRegistryProvider } from "../npm";
import { bestPreReleaseSemVer, isReleaseSemVer } from "../semver";

export const handler: EventHandler<
	subscription.types.OnTagSubscription,
	NpmReleaseConfiguration
> = async ctx => {
	const tag = ctx.data.Tag[0];
	const tagName = tag?.name;
	if (!isReleaseSemVer(tagName)) {
		return status
			.success(`Not a semantic version tag: ${tag.name}`)
			.hidden();
	}
	const releaseVersion = semver.clean(tagName);

	const repo = tag.commit.repo;
	log.info(`Starting npm Release on ${repo.owner}/${repo.name}`);

	const credential = await ctx.credential.resolve(
		secret.gitHubAppToken({
			owner: repo.owner,
			repo: repo.name,
			apiUrl: repo.org.provider.apiUrl,
		}),
	);
	let npmrcCreds: string | undefined;
	try {
		npmrcCreds = await prepareNpmRegistryProvider(ctx);
	} catch (e) {
		const reason = `Failed to generate .npmrc content for NPM registries: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}

	const project = await ctx.project.clone(
		repository.gitHub({
			owner: repo.owner,
			repo: repo.name,
			credential,
			branch: tagName,
		}),
		{ alwaysDeep: false },
	);
	log.info(`Cloned repository ${repo.owner}/${repo.name}#${tagName}`);

	let commitTags: string[];
	try {
		const listTagsResult = await project.exec("git", [
			"tag",
			"--list",
			`--points-at=${tag.commit.sha}`,
		]);
		commitTags = listTagsResult.stdout.trim().split("\n");
	} catch (e) {
		const reason = `Failed to list tags for commit ${tag.commit.sha}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}
	if (!commitTags.includes(tagName)) {
		const reason = `Tag ${tagName} not associated with commit ${
			tag.commit.sha
		}: ${commitTags.join(" ")}`;
		log.error(reason);
		return status.failure(reason);
	}
	const preReleaseTag = bestPreReleaseSemVer(releaseVersion, commitTags);
	const preReleaseVersion = semver.clean(preReleaseTag);

	const pkgJsonPath = project.path("package.json");
	let pkgName: string;
	try {
		const pkgJson: { name: string } = await fs.readJson(pkgJsonPath);
		pkgName = pkgJson.name;
	} catch (e) {
		const reason = `Failed to read package.json: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}

	const pkgVersions = await npmPackageVersions(pkgName);
	if (pkgVersions.includes(releaseVersion)) {
		const reason = `Package ${pkgName}@${releaseVersion} already exists`;
		log.info(reason);
		return status.success(reason);
	}

	try {
		await project.exec("npm", ["pack", `${pkgName}@${preReleaseVersion}`]);
	} catch (e) {
		const reason = `Failed to download ${pkgName}@${preReleaseVersion}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}
	log.info(`Downloaded ${pkgName}@${preReleaseVersion}`);

	const pkgTgz = `${pkgName}-${preReleaseVersion}.tgz`
		.replace(/^@/, "")
		.replace(/\//g, "-");
	try {
		await project.exec("tar", ["-x", "-z", "-f", pkgTgz]);
	} catch (e) {
		const reason = `Failed to unpack ${pkgTgz}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}

	try {
		await project.exec(
			"npm",
			["version", "--no-git-tag-version", releaseVersion],
			{ cwd: project.path("package") },
		);
	} catch (e) {
		const reason = `Failed to undate version of package to ${pkgName}@${releaseVersion}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}
	log.info(`Set version to ${pkgName}@${releaseVersion}`);

	const npmrcPath = project.path("package", ".npmrc");
	try {
		await fs.writeFile(npmrcPath, `ignore-scripts=true\n${npmrcCreds}`);
	} catch (e) {
		const reason = `Failed to write ${npmrcPath}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}

	const access = ctx.configuration?.parameters?.restricted
		? "restricted"
		: "public";
	try {
		await project.exec(
			"npm",
			["publish", ".", `--access=${access}`, "--tag=latest"],
			{ cwd: project.path("package") },
		);
	} catch (e) {
		const reason = `Failed to publish release version of package ${pkgName}@${releaseVersion}: ${e.message}`;
		log.error(reason);
		return status.failure(reason);
	}
	log.info(`Published ${pkgName}@${preReleaseVersion} as ${releaseVersion}`);

	return status.success(`Released ${pkgName} version ${releaseVersion}`);
};
