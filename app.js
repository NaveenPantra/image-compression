const CONSTANTS = {
  DOM_SELECTORS: {
    HTML: 'html',
    TOGGLE_THEME_BUTTON: 'button.theme-toggle',
    IMG_COMPARE_SCRUBBER: '.img-compare-scrubber',
    IMG_COMPARE_CONTAINER: '.img-compare-container',
    COMPRESSED_IMAGE: '.compressed-image',
    ORIGINAL_IMAGE: '.original-image',
    IMG_COMPRESSION_SETTER_CONTAINER: '.img-compression-setter-container',
    IMG_COMPRESSION_SETTER_FRG: '.img-compression-frg',
    IMG_COMPRESSION_SETTER_SCRUBBER: '.img-compression-scrubber',
    IMAGE_UPLOAD_INPUT: '#image-upload-input',
    IMG_COMPRESSION_PROGRESS: '.img-compression-progress',
    IMG_COMPRESSION_PROGRESS_TEXT: '.compression-progress-text',
    IMG_COMPRESSION_PROGRESS_CIRCLE: '.img-compression-progress-white-circle',
    DOWNLOAD_COMPRESSED_IMAGE_BTN: '.download-img'
  },
  DOM_STRINGS: {
    DATA_THEME: 'data-theme',
    LIGHT_THEME_ATTRIBUTE: 'light',
    DARK_THEME_ATTRIBUTE: 'dark',
    HIDE: 'hide',
  },
  ERRORS: {
    NO_IMAGE_SELECTED: new Error('No image selected'),
  },
}


const utils = (function utils() {
  function getDomElements() {
    const DomElements = {}
    for (let selector in CONSTANTS.DOM_SELECTORS) {
      DomElements[CONSTANTS.DOM_SELECTORS[selector]] = document.querySelector(CONSTANTS.DOM_SELECTORS[selector]);
    }
    return DomElements
  }

  function debounce(callback = () => {}, timeToWaitInMs = 0) {
    let timeoutId = null;
    return function debounceInner(...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback.call(this, ...(args ?? []));
      }, timeToWaitInMs);
    }
  }

  function getKbOrMbFromBytes(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  }

  function getNumberFromVhVw(v) {
    try {
      if (typeof v !== "string") return v
      return parseFloat(v.replace(/[vwh\s]/gi, ''));
    } catch (err) {}
  }

  function convertWindowWidthVhToPx(vw) {
    try {
      vw = getNumberFromVhVw(vw)
      return (window.innerWidth * vw) / 100;
    } catch (error) {
      return 0;
    }

  }

  function getImageDimensionsToFitCompareContainer(img) {
    try {
      const {innerHeight} = window;
      const currentContainerWidthInVh = document.querySelector(':root')?.computedStyleMap?.()?.get?.('--container-width')?.[0] ?? 90
      const containerWidth = convertWindowWidthVhToPx(currentContainerWidthInVh)
      const _50vh = innerHeight * 0.5;
      const {naturalHeight = 100, naturalWidth = 100} = img;
      const ratio = Math.min(containerWidth / naturalWidth, _50vh / naturalHeight);
      return { width: naturalWidth * ratio, height: naturalHeight * ratio}
    } catch (err) {
      return { width: 100, height: 100}
    }
  }

  return {
    getDomElements,
    debounce,
    getKbOrMbFromBytes,
    getImageDimensionsToFitCompareContainer,
  }
})()

const model = (function model() {
  let images = {
    originalFile: null,
    originalFileUrl: '',
    compressedFile: null,
    compressedFileUrl: '',
  }
  let compressionRate = {
    value: 10,
    progress: 0,
  }
  function setImageData(
    originalFile = images.originalFile,
    originalFileUrl = images.originalFileUrl,
    compressedFileUrl = images.compressedFileUrl,
    compressedFile = images.compressedFile,
  ) {
    images = {
      originalFile,
      originalFileUrl,
      compressedFileUrl,
      compressedFile,
    }
  }
  function getImagesData() {
    return {...images}
  }

  function setCompressionRate(value = compressionRate.value, progress = compressionRate.progress) {
    compressionRate = {
      value,
      progress,
    }
  }
  function getCompressionRate() {
    return {...compressionRate}
  }

  return { setImageData, getImagesData, setCompressionRate, getCompressionRate }
})()

const view = (function view(model) {
  const DomElements = utils.getDomElements();

  function adjustDimensionsOfImageCompareContainer() {
    try {
      const { IMG_COMPARE_CONTAINER, ORIGINAL_IMAGE } = CONSTANTS.DOM_SELECTORS
      const {width, height} = utils.getImageDimensionsToFitCompareContainer(DomElements[ORIGINAL_IMAGE]);
      DomElements[IMG_COMPARE_CONTAINER].style.width = `${width}px`
      DomElements[IMG_COMPARE_CONTAINER].style.height = `${height}px`
    } catch (err) {
      console.error(err)
    }
  }

  function updateImagesUi({ imageOnLoadCb = () => {}} = {}) {
    try {
      const { originalFileUrl, compressedFileUrl } = model.getImagesData();
      DomElements[CONSTANTS.DOM_SELECTORS.ORIGINAL_IMAGE].src = originalFileUrl;
      DomElements[CONSTANTS.DOM_SELECTORS.COMPRESSED_IMAGE].src = compressedFileUrl;
      DomElements[CONSTANTS.DOM_SELECTORS.ORIGINAL_IMAGE].onload = imageOnLoadCb;
    } catch (err) {
      console.error(err)
    }
  }

  function updateCompressionProgress() {
    const { progress } = model.getCompressionRate();
    if (progress === 100) {
      DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_PROGRESS].classList.add(CONSTANTS.DOM_STRINGS.HIDE);
      return
    }
    DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_PROGRESS].classList.remove(CONSTANTS.DOM_STRINGS.HIDE);
    DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_PROGRESS_TEXT].textContent = `${progress}%`;
    let circleCircumference = Math.PI * 42 * 2
    const strokeDashoffset = ((6 - progress) / 100) * circleCircumference
    DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_PROGRESS_CIRCLE].style.setProperty('--stroke-dashoffset', `${strokeDashoffset}px`)
  }

  function updateDownloadCompressedBtnText() {
    const { compressedFile } = model.getImagesData();
    DomElements[CONSTANTS.DOM_SELECTORS.DOWNLOAD_COMPRESSED_IMAGE_BTN].textContent = `Download Compressed Image (${utils.getKbOrMbFromBytes(compressedFile.size)})`
  }

  return { updateImagesUi, updateCompressionProgress, updateDownloadCompressedBtnText, adjustDimensionsOfImageCompareContainer }
})(model)

const controller = (function controller(model, view) {

  const DomElements =  utils.getDomElements();

  function init() {
    DomElements[CONSTANTS.DOM_SELECTORS.ORIGINAL_IMAGE].onload = adjustImageCompareContainerOnUpdate
    window.addEventListener('resize', adjustImageCompareContainerOnUpdate)
    DomElements[CONSTANTS.DOM_SELECTORS.TOGGLE_THEME_BUTTON].addEventListener('click', toggleTheme);
    DomElements[CONSTANTS.DOM_SELECTORS.IMAGE_UPLOAD_INPUT].addEventListener('change', handleImageUpload);
    DomElements[CONSTANTS.DOM_SELECTORS.DOWNLOAD_COMPRESSED_IMAGE_BTN].addEventListener('click', handleDownloadCompressedImage);
    Scrubber({
      scrubberEle: DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPARE_SCRUBBER],
      parentEle: DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPARE_CONTAINER],
      effectorEle: DomElements[CONSTANTS.DOM_SELECTORS.COMPRESSED_IMAGE],
      config: { handleClickOnParent: true }
    });
    Scrubber({
      scrubberEle: DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_SETTER_SCRUBBER],
      parentEle: DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_SETTER_CONTAINER],
      effectorEle: DomElements[CONSTANTS.DOM_SELECTORS.IMG_COMPRESSION_SETTER_FRG],
      config: { handleClickOnParent: true, onValueChange: utils.debounce(handleOnCompressionValueChange, 300) }
    });
  }

  function toggleTheme() {
    try {
      let theme = DomElements[CONSTANTS.DOM_SELECTORS.HTML].getAttribute(CONSTANTS.DOM_STRINGS.DATA_THEME)
      theme = theme === CONSTANTS.DOM_STRINGS.DARK_THEME_ATTRIBUTE ? CONSTANTS.DOM_STRINGS.LIGHT_THEME_ATTRIBUTE : CONSTANTS.DOM_STRINGS.DARK_THEME_ATTRIBUTE;
      DomElements[CONSTANTS.DOM_SELECTORS.HTML].setAttribute(CONSTANTS.DOM_STRINGS.DATA_THEME, theme)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleImageUpload(event) {
    try {
      const imageFile = event.target.files[0];
      console.log(`size ${imageFile.size / 1024 / 1024} MB`);
      const imageURL = URL.createObjectURL(imageFile);
      model.setImageData(imageFile, imageURL, imageURL);
      view.updateImagesUi({imageOnLoadCb: adjustImageCompareContainerOnUpdate})
      await handleOnCompressionValueChange(model.getCompressionRate().value)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleOnCompressionValueChange(value) {
    try {
      const { originalFile, originalFileUrl} = model.getImagesData();
      if (!originalFile) throw CONSTANTS.ERRORS.NO_IMAGE_SELECTED
      if (value === 0) {
        value = 0.5
      }
      if (value === 100) {
        value = 99.5
      }
      model.setCompressionRate(value, 0);

      const compressionOptions = {
        maxSizeMB: ((originalFile.size * (100 - value)) / 100) / 1024 / 1024,
        useWebWorker: true,
        onProgress: onCompressionProgress,
      }
      requestAnimationFrame(view.updateCompressionProgress)
      const compressedFile = await imageCompression(originalFile, compressionOptions);
      const compressedFileUrl = URL.createObjectURL(compressedFile);
      model.setImageData(originalFile, originalFileUrl, compressedFileUrl, compressedFile);
      view.updateImagesUi()
    } catch (error) {
      console.error(error)
      return Promise.reject(error)
    }
  }

  function onCompressionProgress(progress) {
    model.setCompressionRate(undefined, progress);
    // forcing rendering without requestAnimationFrame
    // For some reason imageCompression might not be using
    // web workers and thus running on main thread and
    // not updating the progress bar with requestAnimationFrame
    view.updateCompressionProgress()
    if (progress === 100) {
      model.setCompressionRate(undefined, 0);
      requestAnimationFrame(view.updateDownloadCompressedBtnText)
    }
  }

  function handleDownloadCompressedImage() {
    try {
      const { compressedFileUrl } = model.getImagesData();
      if (!compressedFileUrl) throw CONSTANTS.ERRORS.NO_IMAGE_SELECTED
      const a = document.createElement('a');
      a.href = compressedFileUrl;
      a.download = 'compressed.jpg';
      a.click();
    } catch (error) {
      console.error(error)
    }
  }

  function adjustImageCompareContainerOnUpdate() {
    try {
      requestAnimationFrame(view.adjustDimensionsOfImageCompareContainer)
    } catch (err) {
      console.error(err)
    }
  }

  return {
    init,
  }
})(model, view)

controller.init()
