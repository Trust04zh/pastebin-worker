import { expect, test, describe } from "vitest"
import { calculateCustomUrlLengths, getMinRandomLength, validateCustomUrl } from "../utils/customUrl.js"
import type { PasteSetting } from "../components/PasteSettingPanel.js"
import { ENTROPY_TO_MIN_LENGTH, MIN_PASTE_NAME_LENGTH, MAX_PASTE_NAME_LENGTH } from "../../shared/constants.js"

// Helper to create default PasteSetting for testing
function createTestSetting(overrides: Partial<PasteSetting> = {}): PasteSetting {
  return {
    uploadKind: "custom",
    expiration: "1d",
    password: "",
    customText: "",
    customEnableRandom: true,
    customAlignedLength: 64,
    customUseSuffixSeparator: true,
    customUsePrefixSeparator: false,
    customSecurityGuarantee: false,
    customEntropyBits: 128,
    manageUrl: "",
    doEncrypt: false,
    ...overrides,
  }
}

describe("calculateCustomUrlLengths", () => {
  test("calculates lengths with various separator combinations", () => {
    // no separators, no custom text
    let result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "",
        customUsePrefixSeparator: false,
        customUseSuffixSeparator: false,
        customAlignedLength: 24,
      }),
    )
    expect(result).toMatchObject({
      customTextLen: 0,
      prefixSepLen: 0,
      suffixSepLen: 0,
      usedLen: 0,
      randomLen: 24,
      totalLen: 24,
    })

    // custom text, no separators
    result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "myfile",
        customUsePrefixSeparator: false,
        customUseSuffixSeparator: false,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({
      customTextLen: 6,
      prefixSepLen: 0,
      suffixSepLen: 0,
      usedLen: 6,
      randomLen: 58,
      totalLen: 64,
    })

    // both separators
    result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "myfile",
        customUsePrefixSeparator: true,
        customUseSuffixSeparator: true,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({
      customTextLen: 6,
      prefixSepLen: 1,
      suffixSepLen: 1,
      usedLen: 8,
      randomLen: 56,
      totalLen: 64,
    })
  })

  test("handles length boundaries and overflow", () => {
    // used length < aligned length
    let result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "a".repeat(60),
        customUsePrefixSeparator: true,
        customUseSuffixSeparator: true,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({ usedLen: 62, randomLen: 2, totalLen: 64 })

    // used length == aligned length
    result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "a".repeat(62),
        customUsePrefixSeparator: true,
        customUseSuffixSeparator: true,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({ usedLen: 64, randomLen: 0, totalLen: 64 })

    // used length > aligned length
    result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "a".repeat(100),
        customUsePrefixSeparator: true,
        customUseSuffixSeparator: true,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({ usedLen: 102, randomLen: 0, totalLen: 102 })
  })

  test("handles disabled random generation", () => {
    const result = calculateCustomUrlLengths(
      createTestSetting({
        customText: "myfile",
        customUseSuffixSeparator: true,
        customEnableRandom: false,
        customAlignedLength: 64,
      }),
    )
    expect(result).toMatchObject({ customTextLen: 6, usedLen: 7, randomLen: 0, totalLen: 7 })
  })
})

describe("getMinRandomLength", () => {
  test("returns 0 when security features are disabled", () => {
    // random disabled
    expect(
      getMinRandomLength(
        createTestSetting({ customEnableRandom: false, customSecurityGuarantee: true, customEntropyBits: 128 }),
      ),
    ).toStrictEqual(0)

    // security guarantee disabled
    expect(
      getMinRandomLength(
        createTestSetting({ customEnableRandom: true, customSecurityGuarantee: false, customEntropyBits: 128 }),
      ),
    ).toStrictEqual(0)
  })

  test("returns correct minimum for different entropy levels", () => {
    const testCases: [128 | 192 | 256][] = [[128], [192], [256]]
    for (const [bits] of testCases) {
      expect(
        getMinRandomLength(
          createTestSetting({ customEnableRandom: true, customSecurityGuarantee: true, customEntropyBits: bits }),
        ),
      ).toStrictEqual(ENTROPY_TO_MIN_LENGTH[bits])
    }
  })
})

describe("validateCustomUrl", () => {
  test("validates length boundaries", () => {
    // valid minimal URL
    let [valid, error] = validateCustomUrl(createTestSetting({ customText: "", customAlignedLength: 4 }))
    expect(valid).toStrictEqual(true)

    // valid maximum URL
    ;[valid, error] = validateCustomUrl(createTestSetting({ customText: "", customAlignedLength: 256 }))
    expect(valid).toStrictEqual(true)

    // aligned length below minimum (random enabled)
    ;[valid, error] = validateCustomUrl(createTestSetting({ customEnableRandom: true, customAlignedLength: 3 }))
    expect(valid).toStrictEqual(false)
    expect(error).toContain(`between ${MIN_PASTE_NAME_LENGTH} and ${MAX_PASTE_NAME_LENGTH}`)

    // aligned length above maximum (random enabled)
    ;[valid, error] = validateCustomUrl(createTestSetting({ customEnableRandom: true, customAlignedLength: 257 }))
    expect(valid).toStrictEqual(false)
    expect(error).toContain(`between ${MIN_PASTE_NAME_LENGTH} and ${MAX_PASTE_NAME_LENGTH}`)

    // total length below minimum (random disabled)
    ;[valid, error] = validateCustomUrl(
      createTestSetting({
        customText: "ab",
        customUsePrefixSeparator: false,
        customUseSuffixSeparator: false,
        customEnableRandom: false,
      }),
    )
    expect(valid).toStrictEqual(false)
    expect(error).toContain(`at least ${MIN_PASTE_NAME_LENGTH} characters`)

    // custom text exceeds maximum (random disabled)
    ;[valid, error] = validateCustomUrl(
      createTestSetting({
        customText: "a".repeat(260),
        customUsePrefixSeparator: false,
        customUseSuffixSeparator: false,
        customEnableRandom: false,
      }),
    )
    expect(valid).toStrictEqual(false)
    expect(error).toContain(`exceed maximum length`)
  })

  test("validates security guarantee constraints", () => {
    // sufficient aligned length
    let [valid, error] = validateCustomUrl(
      createTestSetting({
        customText: "test",
        customEnableRandom: true,
        customSecurityGuarantee: true,
        customEntropyBits: 128,
        customAlignedLength: 30,
      }),
    )
    expect(valid).toStrictEqual(true)

    // insufficient aligned length
    ;[valid, error] = validateCustomUrl(
      createTestSetting({
        customText: "",
        customEnableRandom: true,
        customSecurityGuarantee: true,
        customEntropyBits: 128,
        customAlignedLength: 20,
      }),
    )
    expect(valid).toStrictEqual(false)
    expect(error).toContain(`at least ${ENTROPY_TO_MIN_LENGTH[128]} chars for 128-bit entropy`)

    // custom text at boundary (exactly minimum random length)
    const setting = createTestSetting({
      customText: "a".repeat(40),
      customUsePrefixSeparator: true,
      customUseSuffixSeparator: true,
      customEnableRandom: true,
      customSecurityGuarantee: true,
      customEntropyBits: 128,
      customAlignedLength: 64,
    })
    ;[valid, error] = validateCustomUrl(setting)
    expect(valid).toStrictEqual(true)

    // custom text too long (insufficient random length)
    setting.customText = "a".repeat(41)
    ;[valid, error] = validateCustomUrl(setting)
    expect(valid).toStrictEqual(false)
    expect(error).toContain("Custom text too long")
  })
})
