globalThis.window = globalThis

importScripts('https://cdn.jsdelivr.net/npm/browser-image-compression@1.0.17/dist/browser-image-compression.js')

const ACTIONS = {
  COMPRESS_IMAGE: 'COMPRESS_IMAGE',
  COMPRESS_IMAGE_SUCCESS: 'COMPRESS_IMAGE_SUCCESS',
  COMPRESS_IMAGE_FAILURE: 'COMPRESS_IMAGE_FAILURE',
  COMPRESS_IMAGE_PROGRESS: 'COMPRESS_IMAGE_PROGRESS',
  ERROR: 'ERROR',
}

let compressingFile = null

onmessage = async (event) => {
  const {action = "", payload = {}} = event.data ?? {}
  switch (action) {
    case ACTIONS.COMPRESS_IMAGE: {
      try {
        const {file, options, image} = payload
        console.log(image)
        compressingFile = file
        const compressedImageMessage = await handleCompressImage(file, options)
        postMessage(compressedImageMessage)
      } catch (error) {
        postMessage({action: ACTIONS.COMPRESS_IMAGE_FAILURE, payload: {error}})
      }
    }
  }
}


async function handleCompressImage(file, options) {
  try {
    options.onProgress = (progress) => {
      if (compressingFile !== file) return
      postMessage({action: ACTIONS.COMPRESS_IMAGE_PROGRESS, payload: { progress }})
    }
    const compressedFile = await imageCompression(file, options);
    const compressedFileUrl = URL.createObjectURL(compressedFile);
    return Promise.resolve({
      action: ACTIONS.COMPRESS_IMAGE_SUCCESS,
      payload: {
        file: compressedFile,
        url: compressedFileUrl,
      }
    })
  } catch (error) {
    console.trace(error)
    return Promise.reject(error)
  }
}
