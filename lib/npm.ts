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

import { EventContext } from "@atomist/skill";
import * as fs from "fs-extra";
import {
	NpmRegistryProviderQuery,
	NpmRegistryProviderQueryVariables,
} from "./typings/types";

/**
 * Extract the NpmRegistryProvider providers from the provided
 * configuration, query the graph for their scopes and credentials,
 * and then write an `.npmrc` file in the current directory that
 * contains the credentials and scopes.
 */
export async function prepareNpmRegistryProvider(
	ctx: EventContext,
): Promise<void> {
	const configProviders = ctx.configuration?.[0]?.resourceProviders;
	if (!configProviders) {
		return;
	}
	const configuredNpmRegistryProviderIds = Object.keys(configProviders)
		.filter(rp => configProviders[rp].typeName === "NpmJSRegistryProvider")
		.map(rp => configProviders[rp].selectedResourceProviders)
		.map(registries => registries.map(registry => registry.id))
		.reduce((acc, cur) => acc.concat(cur), []) // flatten
		.filter((value, index, self) => self.indexOf(value) === index); // unique

	const npmJss = await ctx.graphql.query<
		NpmRegistryProviderQuery,
		NpmRegistryProviderQueryVariables
	>("NpmRegistryProvider.graphql");

	if (npmJss?.NpmJSRegistryProvider) {
		const requestedNpmJss = npmJss.NpmJSRegistryProvider.filter(d =>
			configuredNpmRegistryProviderIds.includes(d.id),
		);

		let npmrcContent = "";
		for (const npmJs of requestedNpmJss) {
			if (npmJs.scope) {
				const scope = npmJs.scope.startsWith("@")
					? npmJs.scope
					: `@${npmJs.scope}`;
				npmrcContent += `${scope}:registry=${npmJs.url}\n`;
			}
			const token = (npmJs.credential as any).secret;
			if (token) {
				const host = extractHostFromUrl(npmJs.url);
				npmrcContent += `//${host}/:_authToken=${token}\n`;
			}
		}

		if (npmrcContent) {
			await fs.writeFile(".npmrc", npmrcContent);
		}
	}
}

/** Extract host name from URL */
export function extractHostFromUrl(url: string): string {
	return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}
