/**
 * @file core/reasoning/RuleLoader.js
 * @description Utility for loading and initializing reasoning rules.
 */

import { glob } from 'glob';
import path from 'path';
import { Logger } from '../base/utilities.js';

/**
 * Dynamically loads and initializes reasoning rules from a specified directory.
 *
 * @param {string} ruleDir - The directory to search for rule files.
 * @param {object} dependencies - An object containing dependencies to be injected into the rule constructors (e.g., { lm }).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of initialized rule instances.
 */
export async function loadRules(ruleDir, dependencies) {
  const rules = [];
  const ruleFiles = await glob(`${ruleDir}/*.js`);
  Logger.info(`Found rule files: ${ruleFiles.map(f => path.basename(f)).join(', ')}`);

  for (const file of ruleFiles) {
    if (file.endsWith('RuleHelpers.js') || file.endsWith('index.js')) continue;

    try {
      const module = await import(file);
      const createRuleFn = Object.values(module).find(v => typeof v === 'function' && v.name.startsWith('create'));

      if (createRuleFn) {
        const rule = createRuleFn(dependencies);
        rules.push(rule);
        Logger.info(`Successfully loaded and registered rule: ${rule.id}`);
      } else {
        Logger.warn(`No create function found in rule file: ${file}`);
      }
    } catch (error) {
      Logger.error(`Failed to load rule from ${file}:`, { error });
    }
  }
  return rules;
}