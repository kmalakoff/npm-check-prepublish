import { readFileSync } from 'fs';

/**
 * Read and parse a JSON file, naming the file when it cannot be read or parsed.
 */
export default function readJsonFile(filePath: string) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${(err as Error).message}`);
  }
}
