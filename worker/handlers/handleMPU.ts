import { MPUCreateResponse } from "../../shared/interfaces.js"
import { WorkerError, validateAndGeneratePasteName } from "../common.js"
import { getPasteMetadata } from "../storage/storage.js"
import { parseSize } from "../../shared/parsers.js"

// POST /mpu/create?n=<optional n>&l=<optional random length>
// returns JSON { name: string, key: string, uploadId: string }
export async function handleMPUCreate(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const n = url.searchParams.get("n") || undefined
  const l = url.searchParams.get("l") || undefined

  // Validate and generate paste name
  const name = await validateAndGeneratePasteName(n, l, env)

  const multipartUpload = await env.R2.createMultipartUpload(name)
  const resp: MPUCreateResponse = {
    name,
    key: multipartUpload.key,
    uploadId: multipartUpload.uploadId,
  }
  return new Response(JSON.stringify(resp))
}

// POST /mpu/create-update?name=<name>&password=<password>
// returns JSON { name: string, key: string, uploadId: string }
export async function handleMPUCreateUpdate(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const name = url.searchParams.get("name")
  const password = url.searchParams.get("password")
  if (name === null || password === null) {
    throw new WorkerError(400, `missing name or password (password) in searchParams`)
  }

  const metadata = await getPasteMetadata(env, name)
  if (metadata === null) {
    throw new WorkerError(404, `paste of name ‘${name}’ is not found`)
  }
  if (password !== metadata.passwd) {
    throw new WorkerError(403, `incorrect password for paste ‘${name}’`)
  }

  const multipartUpload = await env.R2.createMultipartUpload(name)
  const resp: MPUCreateResponse = {
    name,
    key: multipartUpload.key,
    uploadId: multipartUpload.uploadId,
  }
  return new Response(JSON.stringify(resp))
}

// PUT /mpu/resume?key=<key>&uploadId=<uploadId>&partNumber=<partNumber>
// return JSON { partNumber: number, etag: string }
export async function handleMPUResume(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  const uploadId = url.searchParams.get("uploadId")
  const partNumberString = url.searchParams.get("partNumber")
  const key = url.searchParams.get("key")
  if (partNumberString === null || uploadId === null || key === null) {
    throw new WorkerError(400, "missing partNumber or uploadId or key in searchParams")
  }
  if (request.body === null) {
    throw new WorkerError(400, "missing request body")
  }

  const partNumber = parseInt(partNumberString)
  const multipartUpload = env.R2.resumeMultipartUpload(key, uploadId)
  const uploadedPart: R2UploadedPart = await multipartUpload.uploadPart(partNumber, request.body)
  return new Response(JSON.stringify(uploadedPart))
}

// POST /mpu/complete?name=<name>&key=<key>&uploadId=<uploadId>
// formdata same as POST/PUT a normal paste, but
//   - field `c` is interpreted as JSON { partNumber: number, etag: string }[]
//   - field `n` is ignored
export async function handleMPUComplete(request: Request, env: Env, completeBody: R2UploadedPart[]): Promise<R2Object> {
  const url = new URL(request.url)
  const uploadId = url.searchParams.get("uploadId")
  const key = url.searchParams.get("key")
  const name = url.searchParams.get("name")
  if (uploadId === null || key === null || name === null) {
    throw new WorkerError(400, `no uploadId or key for MPU complete`)
  }

  const multipartUpload = env.R2.resumeMultipartUpload(key, uploadId)
  if (name !== multipartUpload.key) {
    throw new WorkerError(400, `name ‘${name}’ is not consistent with the originally specified name`)
  }

  const object = await multipartUpload.complete(completeBody)
  if (object.size > parseSize(env.R2_MAX_ALLOWED)!) {
    await env.R2.delete(object.key)
    throw new WorkerError(413, `payload too large (max ${parseSize(env.R2_MAX_ALLOWED)!} bytes allowed)`)
  }
  return object
}
