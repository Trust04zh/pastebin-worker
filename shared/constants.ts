export const CHAR_GEN = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" // Base58
export const NAME_REGEX = /^[a-zA-Z0-9+_\-[\]*$@,;]{3,}$/

export const SHORT_PASTE_NAME_LEN = 4
export const LONG_PASTE_NAME_LEN = 24
export const MIN_PASTE_NAME_LENGTH = 4
export const MAX_PASTE_NAME_LENGTH = 256

export const CUSTOM_URL_LENGTH_PRESETS = [4, 8, 16, 24, 32, 64, 128, 256] as const
export const DEFAULT_CUSTOM_URL_ALIGNED_LENGTH = 64

// Custom URL entropy requirements (Base58 character length for target entropy bits)
export const ENTROPY_TO_MIN_LENGTH: Record<128 | 192 | 256, number> = {
  128: 22, // log2(58) * 22 ≈ 128.88 bits
  192: 33, // log2(58) * 33 ≈ 193.31 bits
  256: 44, // log2(58) * 44 ≈ 257.75 bits
}

export const DEFAULT_PASSWD_LEN = 24
export const MAX_PASSWD_LEN = 128
export const MIN_PASSWD_LEN = 8

export const MAX_URL_REDIRECT_LEN = 2000
export const PASSWD_SEP = ":"
