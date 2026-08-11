import { readUpload } from '../../server/storage.js'

export async function handler(event) {
  try {
    const key = event.queryStringParameters?.key
    if (!key) {
      return { statusCode: 400, body: 'Missing key' }
    }
    const file = await readUpload(key)
    if (!file) {
      return { statusCode: 404, body: 'Not found' }
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: file.buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (err) {
    return { statusCode: 500, body: err.message || 'Error' }
  }
}
