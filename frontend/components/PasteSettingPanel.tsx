import {
  Card,
  CardBody,
  CardHeader,
  CardProps,
  Chip,
  Divider,
  Input,
  mergeClasses,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Switch,
  Tooltip,
} from "@heroui/react"
import { BaseUrl, verifyExpiration, verifyManageUrl, verifyName, noExpirationAllowed } from "../utils/utils.js"
import React from "react"
import { InfoIcon } from "./icons.js"
import { cardOverrides, inputOverrides, radioOverrides, switchOverrides, tst } from "../utils/overrides.js"
import { calculateCustomUrlLengths, getMinRandomLength, validateCustomUrl } from "../utils/customUrl.js"
import { CUSTOM_URL_LENGTH_PRESETS, MIN_PASTE_NAME_LENGTH, MAX_PASTE_NAME_LENGTH } from "../../shared/constants.js"

export type UploadKind = "short" | "long" | "custom" | "manage"

export type PasteSetting = {
  uploadKind: UploadKind
  expiration: string
  password: string

  // Custom URL configuration
  customText?: string // User-defined custom text part
  customEnableRandom: boolean // Enable random suffix
  customAlignedLength: number // Total URL length to be aligned to (excluding base_url)
  customUseSuffixSeparator: boolean
  customUsePrefixSeparator: boolean
  customSecurityGuarantee: boolean // Enforce minimum entropy
  customEntropyBits: 128 | 192 | 256 // Required entropy in bits

  manageUrl: string

  doEncrypt: boolean
}

interface PasteSettingPanelProps extends CardProps {
  setting: PasteSetting
  onSettingChange: (setting: PasteSetting) => void
}

export function PanelSettingsPanel({ setting, onSettingChange, ...rest }: PasteSettingPanelProps) {
  const radioClassNames = mergeClasses(radioOverrides, { labelWrapper: "ml-2.5" })
  const [isCustomLength, setIsCustomLength] = React.useState(false)

  // Use utility functions for custom URL calculations
  const lengths = calculateCustomUrlLengths(setting)
  const minRandomLength = getMinRandomLength(setting)
  const [customLengthValid, customLengthError] = validateCustomUrl(setting)

  // Determine if error is related to aligned length (should show under aligned length input)
  const isAlignedLengthError = customLengthError.includes("Aligned length") // FIXME: hacky
  const isGeneralError = !customLengthValid && !isAlignedLengthError

  // Generate URL preview
  const getUrlPreview = () => {
    const prefixSep = setting.customUsePrefixSeparator ? "~" : ""
    const customPart = `<custom:${lengths.customTextLen}>`
    const suffixSep = setting.customUseSuffixSeparator ? "~" : ""
    const randomPart = setting.customEnableRandom && lengths.randomLen > 0 ? `<random:${lengths.randomLen}>` : ""
    return `${prefixSep}${customPart}${suffixSep}${randomPart}`
  }
  return (
    <Card aria-label="Pastebin setting panel" classNames={cardOverrides} {...rest}>
      <CardHeader className="text-2xl pl-4 pb-2">Settings</CardHeader>
      <Divider className={tst} />
      <CardBody>
        <div className="gap-4 mb-3 flex flex-row">
          <Input
            type="text"
            label={
              <div className="flex items-center gap-1">
                <span>Expiration</span>
                <Tooltip
                  content={
                    noExpirationAllowed
                      ? "Use '0' for no expiration. Units: s (seconds), m (minutes), h (hours), d (days). Example: 7d, 30m, 0"
                      : "Units: s (seconds), m (minutes), h (hours), d (days). Example: 7d, 30m"
                  }
                >
                  <InfoIcon className="inline size-4" />
                </Tooltip>
              </div>
            }
            // to avoid duplicated name, see https://github.com/adobe/react-spectrum/discussions/8037
            aria-labelledby=""
            classNames={{
              base: "basis-80",
              label: "flex flex-row items-center gap-0",
              ...inputOverrides,
            }}
            defaultValue="7d"
            value={setting.expiration}
            isRequired
            onValueChange={(e) => onSettingChange({ ...setting, expiration: e })}
            isInvalid={!verifyExpiration(setting.expiration)[0]}
            errorMessage={verifyExpiration(setting.expiration)[1]}
            description={verifyExpiration(setting.expiration)[1]}
          />
          <Input
            type="password"
            label="Password"
            aria-labelledby=""
            value={setting.password}
            onValueChange={(p) => onSettingChange({ ...setting, password: p })}
            classNames={inputOverrides}
            placeholder={"Generated randomly"}
            description="Used to update/delete your paste"
          />
        </div>
        <RadioGroup
          className="gap-4 mb-3 w-full"
          value={setting.uploadKind}
          onValueChange={(v) => onSettingChange({ ...setting, uploadKind: v as UploadKind })}
        >
          <Radio value="short" description={`Example: ${BaseUrl}/BxWH`} classNames={radioClassNames}>
            Generate a short random URL
          </Radio>
          <Radio
            value="long"
            description={`Example: ${BaseUrl}/5HQWYNmjA4h44SmybeThXXAm`}
            classNames={{
              description: "text-ellipsis max-w-[calc(100vw-5rem)] whitespace-nowrap overflow-hidden",
              ...radioClassNames,
            }}
          >
            Generate a long random URL
          </Radio>
          <Radio value="custom" classNames={radioClassNames}>
            Customized URL
          </Radio>
          {setting.uploadKind === "custom" ? (
            <div className="flex flex-col gap-3">
              {/* Visual URL composition */}
              <div className="flex flex-row items-center gap-1.5 flex-wrap">
                <span className="text-default-500 text-sm">{`${BaseUrl}/`}</span>
                <Tooltip content="Click to toggle prefix separator">
                  <Chip
                    size="md"
                    variant="flat"
                    color={setting.customUsePrefixSeparator ? "success" : "default"}
                    className="cursor-pointer hover:opacity-80 transition-opacity px-3 min-w-[48px] select-none"
                    onClick={() =>
                      onSettingChange({ ...setting, customUsePrefixSeparator: !setting.customUsePrefixSeparator })
                    }
                  >
                    ~
                  </Chip>
                </Tooltip>
                <Tooltip content="Custom text (always enabled, edit below)">
                  <Chip size="md" variant="flat" color="success" className="cursor-not-allowed select-none">
                    custom
                  </Chip>
                </Tooltip>
                <Tooltip content="Click to toggle suffix separator">
                  <Chip
                    size="md"
                    variant="flat"
                    color={setting.customUseSuffixSeparator ? "success" : "default"}
                    className="cursor-pointer hover:opacity-80 transition-opacity px-3 min-w-[48px] select-none"
                    onClick={() =>
                      onSettingChange({ ...setting, customUseSuffixSeparator: !setting.customUseSuffixSeparator })
                    }
                  >
                    ~
                  </Chip>
                </Tooltip>
                <Tooltip content="Click to toggle random suffix">
                  <Chip
                    size="md"
                    variant="flat"
                    color={setting.customEnableRandom ? "success" : "default"}
                    className="cursor-pointer hover:opacity-80 transition-opacity select-none"
                    onClick={() => onSettingChange({ ...setting, customEnableRandom: !setting.customEnableRandom })}
                  >
                    random
                  </Chip>
                </Tooltip>
              </div>

              {/* URL preview and length */}
              <div className="flex flex-row justify-between items-center text-sm">
                <span className="text-default-500 font-mono">{getUrlPreview()}</span>
                <span className="text-default-400">Total: {lengths.totalLen} chars</span>
              </div>

              {/* General error display (not related to aligned length) */}
              {isGeneralError && <div className="text-danger text-sm">{customLengthError}</div>}

              {/* Custom text input */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-sm text-default-600 min-w-[60px]">Custom:</span>
                  <Input
                    value={setting.customText || ""}
                    onValueChange={(n) => onSettingChange({ ...setting, customText: n })}
                    onKeyDown={(e) => {
                      // Prevent arrow keys from triggering navigation
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.stopPropagation()
                      }
                    }}
                    type="text"
                    placeholder="Optional custom text"
                    size="sm"
                    classNames={radioClassNames}
                    isInvalid={!!setting.customText && !verifyName(setting.customText)[0]}
                  />
                </div>
                {setting.customText && !verifyName(setting.customText)[0] && (
                  <div className="text-danger text-sm ml-[76px]">{verifyName(setting.customText)[1]}</div>
                )}
              </div>

              {/* Aligned URL Length (only when random is enabled) */}
              {setting.customEnableRandom && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-default-600 whitespace-nowrap">Aligned URL Length:</span>
                      <Tooltip content="Total length of the URL path (excluding base URL). Random suffix fills remaining space.">
                        <InfoIcon className="inline size-4" />
                      </Tooltip>
                    </div>
                    <Select
                      size="sm"
                      placeholder="Select length"
                      selectedKeys={
                        new Set([
                          isCustomLength
                            ? "custom"
                            : CUSTOM_URL_LENGTH_PRESETS.includes(
                                  setting.customAlignedLength as (typeof CUSTOM_URL_LENGTH_PRESETS)[number],
                                )
                              ? String(setting.customAlignedLength)
                              : "custom",
                        ])
                      }
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string
                        if (value === "custom") {
                          setIsCustomLength(true)
                        } else if (value) {
                          setIsCustomLength(false)
                          const len = Number(value)
                          if (!isNaN(len)) {
                            onSettingChange({ ...setting, customAlignedLength: len })
                          }
                        }
                      }}
                      className="max-w-[120px]"
                    >
                      {[
                        ...CUSTOM_URL_LENGTH_PRESETS.map((len) => (
                          <SelectItem key={String(len)}>{String(len)}</SelectItem>
                        )),
                        <SelectItem key="custom">Custom</SelectItem>,
                      ]}
                    </Select>
                    {isCustomLength && (
                      <Input
                        value={String(setting.customAlignedLength)}
                        onValueChange={(v) => {
                          const len = Number(v)
                          if (!isNaN(len) && v !== "") {
                            onSettingChange({ ...setting, customAlignedLength: len })
                          }
                        }}
                        onKeyDown={(e) => {
                          // Prevent arrow keys from triggering navigation
                          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                            e.stopPropagation()
                          }
                        }}
                        type="number"
                        size="sm"
                        className="max-w-[100px]"
                        min={MIN_PASTE_NAME_LENGTH}
                        max={MAX_PASTE_NAME_LENGTH}
                        placeholder={`${MIN_PASTE_NAME_LENGTH}-${MAX_PASTE_NAME_LENGTH}`}
                      />
                    )}
                  </div>
                  {/* Aligned length error display */}
                  {isAlignedLengthError && <div className="text-danger text-sm">{customLengthError}</div>}
                </div>
              )}

              {/* Fourth row: Security Guarantee + Entropy (only when random is enabled) */}
              {setting.customEnableRandom && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center gap-4">
                    <Switch
                      size="sm"
                      isSelected={setting.customSecurityGuarantee}
                      onValueChange={(v) => onSettingChange({ ...setting, customSecurityGuarantee: v })}
                      classNames={switchOverrides}
                    >
                      Security Guarantee
                    </Switch>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-default-600">Entropy:</span>
                      <Tooltip content="Ensures minimum cryptographic randomness by enforcing a minimum random suffix length">
                        <InfoIcon className="inline size-4" />
                      </Tooltip>
                    </div>
                    <Select
                      size="sm"
                      placeholder="Select entropy"
                      isDisabled={!setting.customSecurityGuarantee}
                      selectedKeys={new Set([String(setting.customEntropyBits)])}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string
                        if (value) {
                          const bits = Number(value) as 128 | 192 | 256
                          if ([128, 192, 256].includes(bits)) {
                            onSettingChange({ ...setting, customEntropyBits: bits })
                          }
                        }
                      }}
                      className="max-w-[120px]"
                    >
                      <SelectItem key="128">128 bits</SelectItem>
                      <SelectItem key="192">192 bits</SelectItem>
                      <SelectItem key="256">256 bits</SelectItem>
                    </Select>
                  </div>
                  {setting.customSecurityGuarantee && (
                    <div className="text-sm text-default-500 ml-2">
                      Requires ≥{minRandomLength} random characters for {setting.customEntropyBits}-bit entropy
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <Radio value="manage" classNames={radioClassNames}>
            <div className="">Update or delete</div>
          </Radio>
          {setting.uploadKind === "manage" ? (
            <Input
              value={setting.manageUrl}
              onValueChange={(m) => onSettingChange({ ...setting, manageUrl: m })}
              onKeyDown={(e) => {
                // Prevent arrow keys from triggering navigation
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.stopPropagation()
                }
              }}
              type="text"
              className="shrink"
              isInvalid={!verifyManageUrl(setting.manageUrl)[0]}
              errorMessage={verifyManageUrl(setting.manageUrl)[1]}
              placeholder={`Manage URL`}
            />
          ) : null}
        </RadioGroup>
        <Divider className={tst} />
        <div className="mt-3 flex flex-row items-center">
          <Switch
            classNames={switchOverrides}
            isSelected={setting.doEncrypt}
            onValueChange={(v) => onSettingChange({ ...setting, doEncrypt: v })}
          >
            Client-side encryption
          </Switch>
          <Tooltip
            content={
              <div className="px-1 py-2 max-w-[20rem]">
                <h3 className="text-normal font-bold mb-2">Client-side encryption</h3>
                <div className="text-small">
                  Your paste is shared via a URL containing the decryption key in the URL hash, which is never sent to
                  the server. Decryption happens in the browser, so only those with the key (not the server) can view
                  the decrypted content.
                </div>
              </div>
            }
          >
            <InfoIcon className="inline size-5 ml-2" />
          </Tooltip>
        </div>
      </CardBody>
    </Card>
  )
}
