<template>
  <div ref="wrapper"
       :class="`croppa-container ${img ? 'croppa--has-target' : ''} ${disabled ? 'croppa--disabled' : ''} ${disableClickToChoose ? 'croppa--disabled-cc' : ''} ${disableDragToMove && disableScrollToZoom ? 'croppa--disabled-mz' : ''} ${fileDraggedOver ? 'croppa--dropzone' : ''}`"
       @dragenter.stop.prevent="_handleDragEnter"
       @dragleave.stop.prevent="_handleDragLeave"
       @dragover.stop.prevent="_handleDragOver"
       @drop.stop.prevent="_handleDrop">
    <input type="file"
           :accept="accept"
           :disabled="disabled"
           v-bind="inputAttrs"
           ref="fileInput"
           @change="_handleInputChange"
           style="height:1px;width:1px;overflow:hidden;margin-left:-99999px;position:absolute;" />
    <div class="slots"
         style="width: 0; height: 0; visibility: hidden;">
      <slot name="initial"></slot>
      <slot name="placeholder"></slot>
    </div>
    <canvas ref="canvas"
            @click.stop.prevent="_handleClick"
            @touchstart.stop="_handlePointerStart"
            @mousedown.stop.prevent="_handlePointerStart"
            @pointerstart.stop.prevent="_handlePointerStart"
            @touchend.stop.prevent="_handlePointerEnd"
            @touchcancel.stop.prevent="_handlePointerEnd"
            @mouseup.stop.prevent="_handlePointerEnd"
            @pointerend.stop.prevent="_handlePointerEnd"
            @pointercancel.stop.prevent="_handlePointerEnd"
            @touchmove.stop="_handlePointerMove"
            @mousemove.stop.prevent="_handlePointerMove"
            @pointermove.stop.prevent="_handlePointerMove"
            @pointerleave.stop.prevent="_handlePointerLeave"
            @DOMMouseScroll.stop="_handleWheel"
            @wheel.stop="_handleWheel"
            @mousewheel.stop="_handleWheel"></canvas>
    <svg class="icon icon-remove"
         v-if="showRemoveButton && img"
         @click="remove"
         :style="`top: -${height/40}px; right: -${width/40}px`"
         viewBox="0 0 1024 1024"
         version="1.1"
         xmlns="http://www.w3.org/2000/svg"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         :width="removeButtonSize || width/10"
         :height="removeButtonSize || width/10">
      <path d="M511.921231 0C229.179077 0 0 229.257846 0 512 0 794.702769 229.179077 1024 511.921231 1024 794.781538 1024 1024 794.702769 1024 512 1024 229.257846 794.781538 0 511.921231 0ZM732.041846 650.633846 650.515692 732.081231C650.515692 732.081231 521.491692 593.683692 511.881846 593.683692 502.429538 593.683692 373.366154 732.081231 373.366154 732.081231L291.761231 650.633846C291.761231 650.633846 430.316308 523.500308 430.316308 512.196923 430.316308 500.696615 291.761231 373.523692 291.761231 373.523692L373.366154 291.918769C373.366154 291.918769 503.453538 430.395077 511.881846 430.395077 520.349538 430.395077 650.515692 291.918769 650.515692 291.918769L732.041846 373.523692C732.041846 373.523692 593.447385 502.547692 593.447385 512.196923 593.447385 521.412923 732.041846 650.633846 732.041846 650.633846Z"
            :fill="removeButtonColor"></path>
    </svg>
  </div>
</template>

<script>
  import u from './util'
  import props from './props'
  import events from './events'
  const PCT_PER_ZOOM = 1 / 100000 // The amount of zooming everytime it happens, in percentage of image width.
  const MIN_MS_PER_CLICK = 500 // If touch duration is shorter than the value, then it is considered as a click.
  const CLICK_MOVE_THRESHOLD = 100 // If touch move distance is greater than this value, then it will by no mean be considered as a click.
  const MIN_WIDTH = 10 // The minimal width the user can zoom to.
  const DEFAULT_PLACEHOLDER_TAKEUP = 2 / 3 // Placeholder text by default takes up this amount of times of canvas width.
  const PINCH_ACCELERATION = 1 // The amount of times by which the pinching is more sensitive than the scolling
  // const DEBUG = false
  export default {
    model: {
      prop: 'value',
      event: events.INIT_EVENT
    },
    props: props,
    data () {
      return {
        canvas: null,
        ctx: null,
        originalImage: null,
        img: null,
        dragging: false,
        lastMovingCoord: null,
        imgData: {
          width: 0,
          height: 0,
          startX: 0,
          startY: 0
        },
        fileDraggedOver: false,
        tabStart: 0,
        scrolling: false,
        pinching: false,
        pinchDistance: 0,
        supportTouch: false,
        pointerMoved: false,
        pointerStartCoord: null,
        naturalWidth: 0,
        naturalHeight: 0,
        scaleRatio: null,
        orientation: 1,
        userMetadata: null,
        imageSet: false,
        currentPointerCoord: null
      }
    },
    computed: {
      outputWidth () {
        return this.width * this.quality
      },
      outputHeight () {
        return this.height * this.quality
      },
      computedPlaceholderFontSize () {
        return this.placeholderFontSize * this.quality
      },
      aspectRatio () {
        return this.naturalWidth / this.naturalHeight
      }
    },
    mounted () {
      this._init()
      u.rAFPolyfill()
      u.toBlobPolyfill()
      let supports = this.supportDetection()
      if (!supports.basic) {
        console.warn('Your browser does not support vue-croppa functionality.')
      }
    },
    watch: {
      outputWidth: function () {
        if (!this.hasImage()) {
          this._init()
        } else {
          if (this.preventWhiteSpace) {
            this.imageSet = false
          }
          this._setSize()
          this._placeImage()
        }
      },
      outputHeight: function () {
        if (!this.hasImage()) {
          this._init()
        } else {
          if (this.preventWhiteSpace) {
            this.imageSet = false
          }
          this._setSize()
          this._placeImage()
        }
      },
      canvasColor: function () {
        if (!this.hasImage()) {
          this._init()
        } else {
          this._draw()
        }
      },
      placeholder: function () {
        if (!this.hasImage()) {
          this._init()
        }
      },
      placeholderColor: function () {
        if (!this.hasImage()) {
          this._init()
        }
      },
      computedPlaceholderFontSize: function () {
        if (!this.hasImage()) {
          this._init()
        }
      },
      preventWhiteSpace (val) {
        if (val) {
          this.imageSet = false
        }
        this._placeImage()
      },
      scaleRatio (val, oldVal) {
        if (!this.hasImage()) return
        if (!u.numberValid(val)) return
        var x = 1
        if (u.numberValid(oldVal) && oldVal !== 0) {
          x = val / oldVal
        }
        var pos = this.currentPointerCoord || {
          x: this.imgData.startX + this.imgData.width / 2,
          y: this.imgData.startY + this.imgData.height / 2
        }
        this.imgData.width = this.naturalWidth * val
        this.imgData.height = this.naturalHeight * val
        if (this.preventWhiteSpace) {
          this._preventZoomingToWhiteSpace()
        }
        if (this.userMetadata) return
        console.log('---------!!!----------')
        let offsetX = (x - 1) * (pos.x - this.imgData.startX)
        let offsetY = (x - 1) * (pos.y - this.imgData.startY)
        this.imgData.startX = this.imgData.startX - offsetX
        this.imgData.startY = this.imgData.startY - offsetY
      },
      'imgData.width': function (val, oldVal) {
        if (!u.numberValid(val)) return
        this.scaleRatio = val / this.naturalWidth
        if (this.hasImage()) {
          if (Math.abs(val - oldVal) > (val * (1 / 100000))) {
            this.$emit(events.ZOOM_EVENT)
            this._draw()
          }
        }
      },
      'imgData.height': function (val) {
        if (!u.numberValid(val)) return
        this.scaleRatio = val / this.naturalHeight
      }
    },
    methods: {
      getCanvas () {
        return this.canvas
      },
      getContext () {
        return this.ctx
      },
      getChosenFile () {
        return this.$refs.fileInput.files[0]
      },
      move (offset) {
        if (!offset) return
        let oldX = this.imgData.startX
        let oldY = this.imgData.startY
        this.imgData.startX += offset.x
        this.imgData.startY += offset.y
        if (this.preventWhiteSpace) {
          this._preventMovingToWhiteSpace()
        }
        if (this.imgData.startX !== oldX || this.imgData.startY !== oldY) {
          this.$emit(events.MOVE_EVENT)
          this._draw()
        }
      },
      moveUpwards (amount = 1) {
        this.move({ x: 0, y: -amount })
      },
      moveDownwards (amount = 1) {
        this.move({ x: 0, y: amount })
      },
      moveLeftwards (amount = 1) {
        this.move({ x: -amount, y: 0 })
      },
      moveRightwards (amount = 1) {
        this.move({ x: amount, y: 0 })
      },
      zoom (zoomIn = true, acceleration = 1) {
        let realSpeed = this.zoomSpeed * acceleration
        let speed = (this.outputWidth * PCT_PER_ZOOM) * realSpeed
        let x = 1
        if (zoomIn) {
          x = 1 + speed
        } else if (this.imgData.width > MIN_WIDTH) {
          x = 1 - speed
        }
        this.scaleRatio *= x
      },
      zoomIn () {
        this.zoom(true)
      },
      zoomOut () {
        this.zoom(false)
      },
      rotate (step = 1) {
        if (this.disableRotation || this.disabled) return
        step = parseInt(step)
        if (isNaN(step) || step > 3 || step < -3) {
          console.warn('Invalid argument for rotate() method. It should one of the integers from -3 to 3.')
          step = 1
        }
        this._rotateByStep(step)
      },
      rotateCCW () {
        this.rotateDegrees(-90)
      },
      rotateCW () {
        this.rotateDegrees(90)
      },
      rotateDegrees (degrees) {
        if (!degrees) return

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2) // move to center
        this.ctx.rotate(degrees * Math.PI / 180)

        // special drawing after rotation
        if (!this.img) return
        if (window.requestAnimationFrame) {
          requestAnimationFrame(() => {
            this._paintBackground()
            this.ctx.drawImage(this.img, -this.canvas.width / 2, -this.canvas.height / 2, this.canvas.height, this.canvas.width)
          })
        } else {
          this._paintBackground()
          this.ctx.drawImage(this.img, -this.canvas.width / 2, -this.canvas.height / 2, this.canvas.height, this.canvas.width)
        }

        this.ctx.translate(-(this.canvas.width / 2), -(this.canvas.height / 2)) // move to top left corner
        this._draw()
        this.$emit(events.ROTATE_EVENT)
      },
      flipX () {
        if (this.disableRotation || this.disabled) return
        this._setOrientation(2)
      },
      flipY () {
        if (this.disableRotation || this.disabled) return
        this._setOrientation(4)
      },
      refresh () {
        this.$nextTick(this._init)
      },
      hasImage () {
        return !!this.imageSet
      },
      applyMetadata (metadata) {
        if (!metadata || !this.hasImage()) return
        this.userMetadata = metadata
        var ori = metadata.orientation || this.orientation || 1
        this._setOrientation(ori, true)
      },
      generateDataUrl (type, compressionRate) {
        if (!this.hasImage()) return ''
        return this.canvas.toDataURL(type, compressionRate)
      },
      generateBlob (callback, mimeType, qualityArgument) {
        if (!this.hasImage()) return null
        this.canvas.toBlob(callback, mimeType, qualityArgument)
      },
      promisedBlob (...args) {
        if (typeof Promise == 'undefined') {
          console.warn('No Promise support. Please add Promise polyfill if you want to use this method.')
          return
        }
        return new Promise((resolve, reject) => {
          try {
            this.generateBlob((blob) => {
              resolve(blob)
            }, args)
          } catch (err) {
            reject(err)
          }
        })
      },
      getMetadata () {
        if (!this.hasImage()) return {}
        let { startX, startY } = this.imgData
        return {
          startX,
          startY,
          scale: this.scaleRatio,
          orientation: this.orientation
        }
      },
      supportDetection () {
        var div = document.createElement('div')
        return {
          'basic': window.requestAnimationFrame && window.File && window.FileReader && window.FileList && window.Blob,
          'dnd': 'ondragstart' in div && 'ondrop' in div
        }
      },
      chooseFile () {
        this.$refs.fileInput.click()
      },
      remove () {
        let ctx = this.ctx
        this._paintBackground()
        this._setImagePlaceholder()
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        let defaultFontSize = this.outputWidth * DEFAULT_PLACEHOLDER_TAKEUP / this.placeholder.length
        let fontSize = (!this.computedPlaceholderFontSize || this.computedPlaceholderFontSize == 0) ? defaultFontSize : this.computedPlaceholderFontSize
        ctx.font = fontSize + 'px sans-serif'
        ctx.fillStyle = (!this.placeholderColor || this.placeholderColor == 'default') ? '#606060' : this.placeholderColor
        ctx.fillText(this.placeholder, this.outputWidth / 2, this.outputHeight / 2)
        let hadImage = this.img != null
        this.originalImage = null
        this.img = null
        this.$refs.fileInput.value = ''
        this.imgData = {
          width: 0,
          height: 0,
          startX: 0,
          startY: 0
        }
        this.orientation = 1
        this.scaleRatio = null
        this.userMetadata = null
        this.imageSet = false
        if (hadImage) {
          this.$emit(events.IMAGE_REMOVE_EVENT)
        }
      },
      _init () {
        this.canvas = this.$refs.canvas
        this._setSize()
        this.canvas.style.backgroundColor = (!this.canvasColor || this.canvasColor == 'default') ? 'transparent' : (typeof this.canvasColor === 'string' ? this.canvasColor : '')
        this.ctx = this.canvas.getContext('2d')
        this.originalImage = null
        this.img = null
        this.imageSet = false
        this._setInitial()
        this.$emit(events.INIT_EVENT, this)
      },
      _setSize () {
        this.canvas.width = this.outputWidth
        this.canvas.height = this.outputHeight
        this.canvas.style.width = this.width + 'px'
        this.canvas.style.height = this.height + 'px'
      },
      _rotateByStep (step) {
        let orientation = 1
        switch (step) {
          case 1:
            orientation = 6
            break
          case 2:
            orientation = 3
            break
          case 3:
            orientation = 8
            break
          case -1:
            orientation = 8
            break
          case -2:
            orientation = 3
            break
          case -3:
            orientation = 6
            break
        }
        this._setOrientation(orientation)
      },
      _setImagePlaceholder () {
        let img
        if (this.$slots.placeholder && this.$slots.placeholder[0]) {
          let vNode = this.$slots.placeholder[0]
          let { tag, elm } = vNode
          if (tag == 'img' && elm) {
            img = elm
          }
        }
        if (!img) return
        var onLoad = () => {
          this.ctx.drawImage(img, 0, 0, this.outputWidth, this.outputHeight)
        }
        if (u.imageLoaded(img)) {
          onLoad()
        } else {
          img.onload = onLoad
        }
      },
      _setInitial () {
        let src, img
        if (this.$slots.initial && this.$slots.initial[0]) {
          let vNode = this.$slots.initial[0]
          let { tag, elm } = vNode
          if (tag == 'img' && elm) {
            img = elm
          }
        }
        if (this.initialImage && typeof this.initialImage === 'string') {
          src = this.initialImage
          img = new Image()
          if (!/^data:/.test(src) && !/^blob:/.test(src)) {
            img.setAttribute('crossOrigin', 'anonymous')
          }
          img.src = src
        } else if (typeof this.initialImage === 'object' && this.initialImage instanceof Image) {
          img = this.initialImage
        }
        if (!src && !img) {
          this.remove()
          return
        }
        if (u.imageLoaded(img)) {
          this.$emit(events.INITIAL_IMAGE_LOADED_EVENT)
          this._onload(img, +img.dataset['exifOrientation'])
        } else {
          img.onload = () => {
            this.$emit(events.INITIAL_IMAGE_LOADED_EVENT)
            this._onload(img, +img.dataset['exifOrientation'])
          }
          img.onerror = () => {
            this.remove()
          }
        }
      },
      _onload (img, orientation = 1) {
        this.originalImage = img
        this.img = img
        if (isNaN(orientation)) {
          orientation = 1
        }
        this._setOrientation(orientation)
      },
      _handleClick () {
        if (!this.hasImage() && !this.disableClickToChoose && !this.disabled && !this.supportTouch) {
          this.chooseFile()
        }
      },
      _handleInputChange () {
        let input = this.$refs.fileInput
        if (!input.files.length) return
        let file = input.files[0]
        this._onNewFileIn(file)
      },
      _onNewFileIn (file) {
        this.$emit(events.FILE_CHOOSE_EVENT, file)
        if (!this._fileSizeIsValid(file)) {
          this.$emit(events.FILE_SIZE_EXCEED_EVENT, file)
          throw new Error('File size exceeds limit which is ' + this.fileSizeLimit + ' bytes.')
        }
        if (!this._fileTypeIsValid(file)) {
          this.$emit(events.FILE_TYPE_MISMATCH_EVENT, file)
          let type = file.type || file.name.toLowerCase().split('.').pop()
          throw new Error(`File type (${type}) does not match what you specified (${this.accept}).`)
        }
        if (typeof window.FileReader !== 'undefined') {
          let fr = new FileReader()
          fr.onload = (e) => {
            let fileData = e.target.result
            let orientation = 1
            try {
              orientation = u.getFileOrientation(u.base64ToArrayBuffer(fileData))
            } catch (err) { }
            if (orientation < 1) orientation = 1
            let img = new Image()
            img.src = fileData
            img.onload = () => {
              this._onload(img, orientation)
              this.$emit(events.NEW_IMAGE)
            }
          }
          fr.readAsDataURL(file)
        }
      },
      _fileSizeIsValid (file) {
        if (!file) return false
        if (!this.fileSizeLimit || this.fileSizeLimit == 0) return true
        return file.size < this.fileSizeLimit
      },
      _fileTypeIsValid (file) {
        if (!this.accepct) return true
        let accept = this.accept
        let baseMimetype = accept.replace(/\/.*$/, '')
        let types = accept.split(',')
        for (let i = 0, len = types.length; i < len; i++) {
          let type = types[i]
          let t = type.trim()
          if (t.charAt(0) == '.') {
            if (file.name.toLowerCase().split('.').pop() === t.toLowerCase().slice(1)) return true
          } else if (/\/\*$/.test(t)) {
            var fileBaseType = file.type.replace(/\/.*$/, '')
            if (fileBaseType === baseMimetype) {
              return true
            }
          } else if (file.type === type) {
            return true
          }
        }
        return false
      },
      _placeImage (applyMetadata) {
        if (!this.img) return
        var imgData = this.imgData
        this.naturalWidth = this.img.naturalWidth
        this.naturalHeight = this.img.naturalHeight
        imgData.startX = u.numberValid(imgData.startX) ? imgData.startX : 0
        imgData.startY = u.numberValid(imgData.startY) ? imgData.startY : 0
        if (this.preventWhiteSpace) {
          this._aspectFill()
        } else if (!this.imageSet) {
          if (this.initialSize == 'contain') {
            this._aspectFit()
          } else if (this.initialSize == 'natural') {
            this._naturalSize()
          } else {
            this._aspectFill()
          }
        } else {
          this.imgData.width = this.naturalWidth * this.scaleRatio
          this.imgData.height = this.naturalHeight * this.scaleRatio
        }
        if (!this.imageSet) {
          if (/top/.test(this.initialPosition)) {
            imgData.startY = 0
          } else if (/bottom/.test(this.initialPosition)) {
            imgData.startY = this.outputHeight - imgData.height
          }
          if (/left/.test(this.initialPosition)) {
            imgData.startX = 0
          } else if (/right/.test(this.initialPosition)) {
            imgData.startX = this.outputWidth - imgData.width
          }
          if (/^-?\d+% -?\d+%$/.test(this.initialPosition)) {
            var result = /^(-?\d+)% (-?\d+)%$/.exec(this.initialPosition)
            var x = +result[1] / 100
            var y = +result[2] / 100
            imgData.startX = x * (this.outputWidth - imgData.width)
            imgData.startY = y * (this.outputHeight - imgData.height)
          }
        }
        applyMetadata && this._applyMetadata()
        if (applyMetadata && this.preventWhiteSpace) {
          this.zoom(false, 0)
        } else {
          this.move({ x: 0, y: 0 })
          this._draw()
        }
      },
      _aspectFill () {
        let imgWidth = this.naturalWidth
        let imgHeight = this.naturalHeight
        let canvasRatio = this.outputWidth / this.outputHeight
        let scaleRatio
        if (this.aspectRatio > canvasRatio) {
          scaleRatio = imgHeight / this.outputHeight
          this.imgData.width = imgWidth / scaleRatio
          this.imgData.height = this.outputHeight
          this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2
          this.imgData.startY = 0
        } else {
          scaleRatio = imgWidth / this.outputWidth
          this.imgData.height = imgHeight / scaleRatio
          this.imgData.width = this.outputWidth
          this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2
          this.imgData.startX = 0
        }
      },
      _aspectFit () {
        let imgWidth = this.naturalWidth
        let imgHeight = this.naturalHeight
        let canvasRatio = this.outputWidth / this.outputHeight
        let scaleRatio
        if (this.aspectRatio > canvasRatio) {
          scaleRatio = imgWidth / this.outputWidth
          this.imgData.height = imgHeight / scaleRatio
          this.imgData.width = this.outputWidth
          this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2
        } else {
          scaleRatio = imgHeight / this.outputHeight
          this.imgData.width = imgWidth / scaleRatio
          this.imgData.height = this.outputHeight
          this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2
        }
      },
      _naturalSize () {
        let imgWidth = this.naturalWidth
        let imgHeight = this.naturalHeight
        this.imgData.width = imgWidth
        this.imgData.height = imgHeight
        this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2
        this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2
      },
      _handlePointerStart (evt) {
        this.supportTouch = true
        this.pointerMoved = false
        let pointerCoord = u.getPointerCoords(evt, this)
        this.pointerStartCoord = pointerCoord
        if (this.disabled) return
        // simulate click with touch on mobile devices
        if (!this.hasImage() && !this.disableClickToChoose) {
          this.tabStart = new Date().valueOf()
          return
        }
        // ignore mouse right click and middle click
        if (evt.which && evt.which > 1) return
        if (!evt.touches || evt.touches.length === 1) {
          this.dragging = true
          this.pinching = false
          let coord = u.getPointerCoords(evt, this)
          this.lastMovingCoord = coord
        }
        if (evt.touches && evt.touches.length === 2 && !this.disablePinchToZoom) {
          this.dragging = false
          this.pinching = true
          this.pinchDistance = u.getPinchDistance(evt, this)
        }
        let cancelEvents = ['mouseup', 'touchend', 'touchcancel', 'pointerend', 'pointercancel']
        for (let i = 0, len = cancelEvents.length; i < len; i++) {
          let e = cancelEvents[i]
          document.addEventListener(e, this._handlePointerEnd)
        }
      },
      _handlePointerEnd (evt) {
        let pointerMoveDistance = 0
        if (this.pointerStartCoord) {
          let pointerCoord = u.getPointerCoords(evt, this)
          pointerMoveDistance = Math.sqrt(Math.pow(pointerCoord.x - this.pointerStartCoord.x, 2) + Math.pow(pointerCoord.y - this.pointerStartCoord.y, 2)) || 0
        }
        if (this.disabled) return
        if (!this.hasImage() && !this.disableClickToChoose) {
          let tabEnd = new Date().valueOf()
          if ((pointerMoveDistance < CLICK_MOVE_THRESHOLD) && tabEnd - this.tabStart < MIN_MS_PER_CLICK && this.supportTouch) {
            this.chooseFile()
          }
          this.tabStart = 0
          return
        }
        this.dragging = false
        this.pinching = false
        this.pinchDistance = 0
        this.lastMovingCoord = null
        this.pointerMoved = false
        this.pointerStartCoord = null
      },
      _handlePointerMove (evt) {
        this.pointerMoved = true
        if (!this.hasImage()) return
        let coord = u.getPointerCoords(evt, this)
        this.currentPointerCoord = coord
        if (this.disabled || this.disableDragToMove) return
        evt.preventDefault()
        if (!evt.touches || evt.touches.length === 1) {
          if (!this.dragging) return
          if (this.lastMovingCoord) {
            this.move({
              x: coord.x - this.lastMovingCoord.x,
              y: coord.y - this.lastMovingCoord.y
            })
          }
          this.lastMovingCoord = coord
        }
        if (evt.touches && evt.touches.length === 2 && !this.disablePinchToZoom) {
          if (!this.pinching) return
          let distance = u.getPinchDistance(evt, this)
          let delta = distance - this.pinchDistance
          this.zoom(delta > 0, PINCH_ACCELERATION)
          this.pinchDistance = distance
        }
      },
      _handlePointerLeave () {
        this.currentPointerCoord = null
      },
      _handleWheel (evt) {
        if (this.disabled || this.disableScrollToZoom || !this.hasImage()) return
        evt.preventDefault()
        this.scrolling = true
        if (evt.wheelDelta < 0 || evt.deltaY > 0 || evt.detail > 0) {
          this.zoom(this.reverseScrollToZoom)
        } else if (evt.wheelDelta > 0 || evt.deltaY < 0 || evt.detail < 0) {
          this.zoom(!this.reverseScrollToZoom)
        }
        this.$nextTick(() => {
          this.scrolling = false
        })
      },
      _handleDragEnter (evt) {
        if (this.disabled || this.disableDragAndDrop || this.hasImage() || !u.eventHasFile(evt)) return
        this.fileDraggedOver = true
      },
      _handleDragLeave (evt) {
        if (!this.fileDraggedOver || !u.eventHasFile(evt)) return
        this.fileDraggedOver = false
      },
      _handleDragOver (evt) {
      },
      _handleDrop (evt) {
        if (!this.fileDraggedOver || !u.eventHasFile(evt)) return
        this.fileDraggedOver = false
        let file
        let dt = evt.dataTransfer
        if (!dt) return
        if (dt.items) {
          for (var i = 0, len = dt.items.length; i < len; i++) {
            let item = dt.items[i]
            if (item.kind == 'file') {
              file = item.getAsFile()
              break
            }
          }
        } else {
          file = dt.files[0]
        }
        if (file) {
          this._onNewFileIn(file)
        }
      },
      _preventMovingToWhiteSpace () {
        if (this.imgData.startX > 0) {
          this.imgData.startX = 0
        }
        if (this.imgData.startY > 0) {
          this.imgData.startY = 0
        }
        if (this.outputWidth - this.imgData.startX > this.imgData.width) {
          this.imgData.startX = -(this.imgData.width - this.outputWidth)
        }
        if (this.outputHeight - this.imgData.startY > this.imgData.height) {
          this.imgData.startY = -(this.imgData.height - this.outputHeight)
        }
      },
      _preventZoomingToWhiteSpace () {
        if (this.imgData.width < this.outputWidth) {
          this.scaleRatio = this.outputWidth / this.naturalWidth
        }
        if (this.imgData.height < this.outputHeight) {
          this.scaleRatio = this.outputHeight / this.naturalHeight
        }
      },
      _setOrientation (orientation = 6, applyMetadata) {
        if (!this.img) return
        var useOriginal = applyMetadata && this.userMetadata.orientation !== this.orientation
        if (orientation > 1 || useOriginal) {
          var _img = u.getRotatedImage(useOriginal ? this.originalImage : this.img, orientation)
          _img.onload = () => {
            this.img = _img
            this._placeImage(applyMetadata)
          }
        } else {
          this._placeImage(applyMetadata)
        }
        if (orientation == 2) {
          // flip x
          this.orientation = u.flipX(this.orientation)
        } else if (orientation == 4) {
          // flip y
          this.orientation = u.flipY(this.orientation)
        } else if (orientation == 6) {
          // 90 deg
          this.orientation = u.rotate90(this.orientation)
        } else if (orientation == 3) {
          // 180 deg
          this.orientation = u.rotate90(u.rotate90(this.orientation))
        } else if (orientation == 8) {
          // 270 deg
          this.orientation = u.rotate90(u.rotate90(u.rotate90(this.orientation)))
        } else {
          this.orientation = orientation
        }
        if (useOriginal) {
          this.orientation = orientation
        }
      },
      _paintBackground () {
        let backgroundColor = (!this.canvasColor || this.canvasColor == 'default') ? 'transparent' : this.canvasColor
        this.ctx.fillStyle = backgroundColor
        this.ctx.clearRect(0, 0, this.outputWidth, this.outputHeight)
        this.ctx.fillRect(0, 0, this.outputWidth, this.outputHeight)
      },
      _draw () {
        this.$nextTick(() => {
          if (!this.img) return
          if (window.requestAnimationFrame) {
            requestAnimationFrame(this._drawFrame)
          } else {
            this._drawFrame()
          }
        })
      },
      _drawFrame () {
        let ctx = this.ctx
        let { startX, startY, width, height } = this.imgData
        this._paintBackground()
        ctx.drawImage(this.img, startX, startY, width, height)
        this.$emit(events.DRAW, ctx)
        if (!this.imageSet) {
          this.imageSet = true
          this.$emit(events.NEW_IMAGE_DRAWN)
        }
      },
      _applyMetadata () {
        if (!this.userMetadata) return
        var { startX, startY, scale } = this.userMetadata
        if (u.numberValid(startX)) {
          this.imgData.startX = startX
        }
        if (u.numberValid(startY)) {
          this.imgData.startY = startY
        }
        if (u.numberValid(scale)) {
          this.scaleRatio = scale
        }
        this.$nextTick(() => {
          this.userMetadata = null
        })
      }
    }
  }
</script>

<style lang="stylus">
  .croppa-container
    display: inline-block
    cursor: pointer
    transition: all .3s
    position: relative
    font-size: 0
    align-self: flex-start
    background-color: #e6e6e6
    canvas
      transition: all .3s
    &:hover
      opacity: .7
    &.croppa--dropzone
      box-shadow: inset 0 0 10px lightness(black, 20%)
      canvas
        opacity: .5
    &.croppa--disabled-cc
      cursor: default
      &:hover
        opacity: 1
    &.croppa--has-target
      cursor: move
      &:hover
        opacity: 1
      &.croppa--disabled-mz
        cursor: default
    &.croppa--disabled
      cursor: not-allowed
      &:hover
        opacity: 1
    svg.icon-remove
      position: absolute
      background: white
      border-radius: 50%
      filter: drop-shadow(-2px 2px 2px rgba(0, 0, 0, 0.7))
      z-index: 10
      cursor: pointer
      border: 2px solid white
</style>