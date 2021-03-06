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

import { childProcess, EventContext, log } from "@atomist/skill";

import {
	NpmRegistryProviderQuery,
	NpmRegistryProviderQueryVariables,
} from "./typings/types";

/**
 * Extract the NpmRegistryProvider providers from the provided
 * configuration, query the graph for their scopes and credentials,
 * and return the contents for an `.npmrc` with the credentials and
 * scopes.
 */
export async function prepareNpmRegistryProvider(
	ctx: EventContext,
): Promise<string> {
	const configProviders = ctx.configuration?.resourceProviders;
	if (!configProviders) {
		return "";
	}
	const configuredNpmRegistryProviderIds = Object.keys(configProviders)
		.filter(rp => configProviders[rp].typeName === "NpmRegistryProvider")
		.map(rp => configProviders[rp].selectedResourceProviders)
		.map(registries => registries.map(registry => registry.id))
		.reduce((acc, cur) => acc.concat(cur), []) // flatten
		.filter((value, index, self) => self.indexOf(value) === index); // unique

	const npmRegistries = await ctx.graphql.query<
		NpmRegistryProviderQuery,
		NpmRegistryProviderQueryVariables
	>("NpmRegistryProvider.graphql");

	let npmrcContent = "";
	if (npmRegistries?.NpmRegistryProvider) {
		const requestedNpmRegistries = npmRegistries.NpmRegistryProvider.filter(
			d => configuredNpmRegistryProviderIds.includes(d.id),
		);

		for (const npmRegistry of requestedNpmRegistries) {
			if (npmRegistry.scope) {
				const scope = npmRegistry.scope.startsWith("@")
					? npmRegistry.scope
					: `@${npmRegistry.scope}`;
				npmrcContent += `${scope}:registry=${npmRegistry.url}\n`;
			}
			if (npmRegistry.__typename === "NpmJSRegistryProvider") {
				const token = ((npmRegistry as any)?.credential as any)?.secret;
				if (token) {
					const hostPath = removeScheme(npmRegistry.url);
					npmrcContent += `${hostPath}:_authToken=${token}\n`;
				}
			}
		}
	}
	return npmrcContent;
}

/** Remove scheme, ensure it starts with // and ends with /. */
export function removeScheme(url: string): string {
	return url.replace(/^[a-z]+:\/\//, "//").replace(/\/*$/, "/");
}

/** Get available versions of a package. */
export async function npmPackageVersions(pkg: string): Promise<string[]> {
	try {
		const viewResult = await childProcess.execPromise("npm", [
			"view",
			pkg,
			"versions",
			"--json",
		]);
		const versions: string[] = JSON.parse(viewResult.stdout);
		return versions;
	} catch (e) {
		log.warn(`Failed to get versions of ${pkg}: ${e.message}`);
		return [];
	}
}
