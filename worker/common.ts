import {
  CHAR_GEN,
  NAME_REGEX,
  MIN_PASTE_NAME_LENGTH,
  MAX_PASTE_NAME_LENGTH,
  LONG_PASTE_NAME_LEN,
} from "../shared/constants.js"
import { pasteNameAvailable } from "./storage/storage.js"

export function decode(arrayBuffer: ArrayBuffer): string {
  return new TextDecoder().decode(arrayBuffer)
}

export function btoa_utf8(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)))
}

export function atob_utf8(value: string): string {
  const value_latin1 = atob(value)
  return new TextDecoder("utf-8").decode(
    Uint8Array.from({ length: value_latin1.length }, (element, index) => value_latin1.charCodeAt(index)),
  )
}

export class WorkerError extends Error {
  public statusCode: number
  constructor(statusCode: number, msg: string) {
    super(msg)
    this.statusCode = statusCode
  }
}

export function workerAssert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new WorkerError(500, `Assertion failed: ${msg}`)
  }
}

export function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function genRandStr(len: number) {
  // TODO: switch to Web Crypto random generator
  let str = ""
  const numOfRand = CHAR_GEN.length
  for (let i = 0; i < len; i++) {
    str += CHAR_GEN.charAt(Math.floor(Math.random() * numOfRand))
  }
  return str
}

export function escapeHtml(str: string): string {
  const tagsToReplace: Map<string, string> = new Map([
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot"],
    ["'", "&#x27"],
  ])
  return str.replace(/[&<>"']/g, function (tag): string {
    return tagsToReplace.get(tag) || tag
  })
}

export function isLegalUrl(url: string): boolean {
  return URL.canParse(url)
}

export async function validateAndGeneratePasteName(
  namePrefix: string | undefined,
  randomLenStr: string | undefined,
  env: Env,
): Promise<string> {
  // Parse random length parameter
  let randomLen: number
  if (randomLenStr !== undefined) {
    randomLen = Number(randomLenStr)
    if (isNaN(randomLen) || randomLen < 0) {
      throw new WorkerError(400, `invalid random length: ${randomLenStr}`)
    }
  } else {
    // Default to LONG_PASTE_NAME_LEN if namePrefix is also undefined
    randomLen = namePrefix === undefined ? LONG_PASTE_NAME_LEN : 0
  }
  // Validate name characters if provided
  if (namePrefix !== undefined && namePrefix.length > 0) {
    // Strip leading and trailing ~ (separators)
    let nameToValidate = namePrefix
    if (nameToValidate.startsWith("~")) {
      nameToValidate = nameToValidate.slice(1)
    }
    if (nameToValidate.endsWith("~")) {
      nameToValidate = nameToValidate.slice(0, -1)
    }

    // Check if the remaining part contains ~ (not allowed in custom text)
    if (nameToValidate.includes("~")) {
      throw new WorkerError(400, `name cannot contain '~' except as prefix/suffix separator`)
    }

    // Validate custom text characters (if not empty)
    if (nameToValidate.length > 0 && !NAME_REGEX.test(nameToValidate)) {
      throw new WorkerError(400, `Name ${nameToValidate} not satisfying regexp ${NAME_REGEX}`)
    }
  }

  // Calculate total URL length
  const prefix = namePrefix || ""
  const totalLen = prefix.length + randomLen

  // Validate total length bounds
  if (totalLen < MIN_PASTE_NAME_LENGTH) {
    throw new WorkerError(
      400,
      `total URL length must be at least ${MIN_PASTE_NAME_LENGTH} characters (current: ${totalLen})`,
    )
  }
  if (totalLen > MAX_PASTE_NAME_LENGTH) {
    throw new WorkerError(
      400,
      `total URL length must be at most ${MAX_PASTE_NAME_LENGTH} characters (current: ${totalLen})`,
    )
  }

  // Generate paste name and check availability
  let pasteName: string
  if (randomLen === 0) {
    // Deterministic name: check once, fail if not available
    pasteName = prefix
    if (!(await pasteNameAvailable(env, pasteName))) {
      throw new WorkerError(409, `name '${pasteName}' is already used`)
    }
  } else {
    // Name with random suffix: retry up to 3 times
    const maxAttempts = 3
    let attempts = 0
    let available = false

    while (attempts < maxAttempts) {
      pasteName = prefix + genRandStr(randomLen)
      if (await pasteNameAvailable(env, pasteName)) {
        available = true
        break
      }
      attempts++
    }

    if (!available) {
      throw new WorkerError(
        409,
        `unable to generate available paste name after ${maxAttempts} attempts (try increasing random length 'l' or using a different name prefix 'n')`,
      )
    }
  }

  return pasteName!
}
