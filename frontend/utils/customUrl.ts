import type { PasteSetting } from "../components/PasteSettingPanel.js"
import { ENTROPY_TO_MIN_LENGTH, MIN_PASTE_NAME_LENGTH, MAX_PASTE_NAME_LENGTH } from "../../shared/constants.js"

// Calculate all custom URL related lengths
export function calculateCustomUrlLengths(setting: PasteSetting) {
  const customTextLen = (setting.customText || "").length
  const prefixSepLen = setting.customUsePrefixSeparator ? 1 : 0
  const suffixSepLen = setting.customUseSuffixSeparator ? 1 : 0
  const usedLen = prefixSepLen + customTextLen + suffixSepLen

  let randomLen = 0
  if (setting.customEnableRandom) {
    // If total exceeds aligned length, don't pad random
    if (usedLen >= setting.customAlignedLength) {
      randomLen = 0
    } else {
      randomLen = Math.max(0, setting.customAlignedLength - usedLen)
    }
  }

  const totalLen = usedLen + randomLen

  return {
    customTextLen,
    prefixSepLen,
    suffixSepLen,
    usedLen,
    randomLen,
    totalLen,
  }
}

// Get minimum random length based on security settings
export function getMinRandomLength(setting: PasteSetting): number {
  if (!setting.customEnableRandom) return 0
  if (!setting.customSecurityGuarantee) return 0
  return ENTROPY_TO_MIN_LENGTH[setting.customEntropyBits]
}

// Validate custom URL configuration
export function validateCustomUrl(setting: PasteSetting): [boolean, string] {
  const { usedLen, randomLen } = calculateCustomUrlLengths(setting)

  // Validate aligned length bounds
  if (
    setting.customEnableRandom &&
    (setting.customAlignedLength < MIN_PASTE_NAME_LENGTH || setting.customAlignedLength > MAX_PASTE_NAME_LENGTH)
  ) {
    return [false, `Aligned length must be between ${MIN_PASTE_NAME_LENGTH} and ${MAX_PASTE_NAME_LENGTH}`]
  }

  // Validate total length (without random)
  if (!setting.customEnableRandom && usedLen < MIN_PASTE_NAME_LENGTH) {
    return [false, `Total length must be at least ${MIN_PASTE_NAME_LENGTH} characters`]
  }

  if (usedLen > MAX_PASTE_NAME_LENGTH) {
    return [false, `Custom text + separators exceed maximum length (${MAX_PASTE_NAME_LENGTH})`]
  }

  // When security guarantee is enabled, validate aligned length meets minimum entropy requirement
  if (setting.customEnableRandom && setting.customSecurityGuarantee) {
    const minRandom = getMinRandomLength(setting)
    if (setting.customAlignedLength < minRandom) {
      return [false, `Aligned length must be at least ${minRandom} chars for ${setting.customEntropyBits}-bit entropy`]
    }

    // Check if custom text + separators leave enough room for minimum random length
    if (randomLen < minRandom) {
      const { prefixSepLen, suffixSepLen } = calculateCustomUrlLengths(setting)
      const maxCustomTextLen = setting.customAlignedLength - prefixSepLen - suffixSepLen - minRandom
      return [
        false,
        `Custom text too long (max ${maxCustomTextLen} chars for ${setting.customEntropyBits}-bit entropy)`,
      ]
    }
  }

  // When random is enabled and security guarantee is disabled, warn if length exceeds aligned
  if (setting.customEnableRandom && !setting.customSecurityGuarantee && usedLen > setting.customAlignedLength) {
    // This is allowed, just no random padding will be added
    // TODO: warn user?
  }

  return [true, ""]
}
