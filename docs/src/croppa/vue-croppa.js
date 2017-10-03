/*
 * vue-croppa v1.0.2
 * https://github.com/zhanziyang/vue-croppa
 * 
 * Copyright (c) 2017 zhanziyang
 * Released under the ISC license
 */
  
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('canvas-exif-orientation')) :
	typeof define === 'function' && define.amd ? define(['canvas-exif-orientation'], factory) :
	(global.Croppa = factory(global.CanvasExifOrientation));
}(this, (function (CanvasExifOrientation) { 'use strict';

CanvasExifOrientation = CanvasExifOrientation && 'default' in CanvasExifOrientation ? CanvasExifOrientation['default'] : CanvasExifOrientation;

var u = {
  onePointCoord: function onePointCoord(point, vm) {
    var canvas = vm.canvas,
        quality = vm.quality;

    var rect = canvas.getBoundingClientRect();
    var clientX = point.clientX;
    var clientY = point.clientY;
    return {
      x: (clientX - rect.left) * quality,
      y: (clientY - rect.top) * quality
    };
  },
  getPointerCoords: function getPointerCoords(evt, vm) {
    var pointer = void 0;
    if (evt.touches && evt.touches[0]) {
      pointer = evt.touches[0];
    } else if (evt.changedTouches && evt.changedTouches[0]) {
      pointer = evt.changedTouches[0];
    } else {
      pointer = evt;
    }
    return this.onePointCoord(pointer, vm);
  },
  getPinchDistance: function getPinchDistance(evt, vm) {
    var pointer1 = evt.touches[0];
    var pointer2 = evt.touches[1];
    var coord1 = this.onePointCoord(pointer1, vm);
    var coord2 = this.onePointCoord(pointer2, vm);

    return Math.sqrt(Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2));
  },
  getPinchCenterCoord: function getPinchCenterCoord(evt, vm) {
    var pointer1 = evt.touches[0];
    var pointer2 = evt.touches[1];
    var coord1 = this.onePointCoord(pointer1, vm);
    var coord2 = this.onePointCoord(pointer2, vm);

    return {
      x: (coord1.x + coord2.x) / 2,
      y: (coord1.y + coord2.y) / 2
    };
  },
  imageLoaded: function imageLoaded(img) {
    return img.complete && img.naturalWidth !== 0;
  },
  rAFPolyfill: function rAFPolyfill() {
    // rAF polyfill
    if (typeof document == 'undefined' || typeof window == 'undefined') return;
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || // Webkit中此取消方法的名字变了
      window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function (callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16.7 - (currTime - lastTime));
        var id = window.setTimeout(function () {
          var arg = currTime + timeToCall;
          callback(arg);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
      };
    }

    Array.isArray = function (arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  },
  toBlobPolyfill: function toBlobPolyfill() {
    if (typeof document == 'undefined' || typeof window == 'undefined' || !HTMLCanvasElement) return;
    var binStr, len, arr;
    if (!HTMLCanvasElement.prototype.toBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function value(callback, type, quality) {
          binStr = atob(this.toDataURL(type, quality).split(',')[1]);
          len = binStr.length;
          arr = new Uint8Array(len);

          for (var i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i);
          }

          callback(new Blob([arr], { type: type || 'image/png' }));
        }
      });
    }
  },
  eventHasFile: function eventHasFile(evt) {
    var dt = evt.dataTransfer || evt.originalEvent.dataTransfer;
    if (dt.types) {
      for (var i = 0, len = dt.types.length; i < len; i++) {
        if (dt.types[i] == 'Files') {
          return true;
        }
      }
    }

    return false;
  },
  getFileOrientation: function getFileOrientation(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    if (view.getUint16(0, false) != 0xFFD8) return -2;
    var length = view.byteLength;
    var offset = 2;
    while (offset < length) {
      var marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xFFE1) {
        if (view.getUint32(offset += 2, false) != 0x45786966) return -1;
        var little = view.getUint16(offset += 6, false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        var tags = view.getUint16(offset, little);
        offset += 2;
        for (var i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) == 0x0112) {
            return view.getUint16(offset + i * 12 + 8, little);
          }
        }
      } else if ((marker & 0xFF00) != 0xFF00) break;else offset += view.getUint16(offset, false);
    }
    return -1;
  },
  base64ToArrayBuffer: function base64ToArrayBuffer(base64) {
    base64 = base64.replace(/^data:([^;]+);base64,/gmi, '');
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },
  getRotatedImage: function getRotatedImage(img, orientation) {
    var _canvas = CanvasExifOrientation.drawImage(img, orientation);
    var _img = new Image();
    _img.src = _canvas.toDataURL();
    return _img;
  },
  flipX: function flipX(ori) {
    if (ori % 2 == 0) {
      return ori - 1;
    }

    return ori + 1;
  },
  flipY: function flipY(ori) {
    var map = {
      1: 4,
      4: 1,
      2: 3,
      3: 2,
      5: 8,
      8: 5,
      6: 7,
      7: 6
    };

    return map[ori];
  },
  rotate90: function rotate90(ori) {
    var map = {
      1: 6,
      2: 7,
      3: 8,
      4: 5,
      5: 2,
      6: 3,
      7: 4,
      8: 1
    };

    return map[ori];
  },
  numberValid: function numberValid(n) {
    return typeof n === 'number' && !isNaN(n);
  }
};

Number.isInteger = Number.isInteger || function (value) {
  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
};

var initialImageType = String;
if (window && window.Image) {
  initialImageType = [String, Image];
}

var props = {
  value: Object,
  width: {
    type: Number,
    default: 200,
    validator: function validator(val) {
      return val > 0;
    }
  },
  height: {
    type: Number,
    default: 200,
    validator: function validator(val) {
      return val > 0;
    }
  },
  placeholder: {
    type: String,
    default: 'Choose an image'
  },
  placeholderColor: {
    default: '#606060'
  },
  placeholderFontSize: {
    type: Number,
    default: 0,
    validator: function validator(val) {
      return val >= 0;
    }
  },
  canvasColor: {
    default: 'transparent'
  },
  quality: {
    type: Number,
    default: 2,
    validator: function validator(val) {
      return val > 0;
    }
  },
  zoomSpeed: {
    default: 3,
    type: Number,
    validator: function validator(val) {
      return val > 0;
    }
  },
  accept: String,
  fileSizeLimit: {
    type: Number,
    default: 0,
    validator: function validator(val) {
      return val >= 0;
    }
  },
  disabled: Boolean,
  disableDragAndDrop: Boolean,
  disableClickToChoose: Boolean,
  disableDragToMove: Boolean,
  disableScrollToZoom: Boolean,
  disablePinchToZoom: Boolean,
  disableRotation: Boolean,
  reverseScrollToZoom: Boolean,
  preventWhiteSpace: Boolean,
  showRemoveButton: {
    type: Boolean,
    default: true
  },
  removeButtonColor: {
    type: String,
    default: 'red'
  },
  removeButtonSize: {
    type: Number
  },
  initialImage: initialImageType,
  initialSize: {
    type: String,
    default: 'cover',
    validator: function validator(val) {
      return val === 'cover' || val === 'contain' || val === 'natural';
    }
  },
  initialPosition: {
    type: String,
    default: 'center',
    validator: function validator(val) {
      var valids = ['center', 'top', 'bottom', 'left', 'right'];
      return val.split(' ').every(function (word) {
        return valids.indexOf(word) >= 0;
      }) || /^-?\d+% -?\d+%$/.test(val);
    }
  },
  inputAttrs: Object
};

var events = {
  INIT_EVENT: 'init',
  FILE_CHOOSE_EVENT: 'file-choose',
  FILE_SIZE_EXCEED_EVENT: 'file-size-exceed',
  FILE_TYPE_MISMATCH_EVENT: 'file-type-mismatch',
  NEW_IMAGE: 'new-image',
  NEW_IMAGE_DRAWN: 'new-image-drawn',
  IMAGE_REMOVE_EVENT: 'image-remove',
  MOVE_EVENT: 'move',
  ROTATE_EVENT: 'rotate',
  ZOOM_EVENT: 'zoom',
  DRAW: 'draw',
  INITIAL_IMAGE_LOADED_EVENT: 'initial-image-loaded'
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var PCT_PER_ZOOM = 1 / 100000; // The amount of zooming everytime it happens, in percentage of image width.
var MIN_MS_PER_CLICK = 500; // If touch duration is shorter than the value, then it is considered as a click.
var CLICK_MOVE_THRESHOLD = 100; // If touch move distance is greater than this value, then it will by no mean be considered as a click.
var MIN_WIDTH = 10; // The minimal width the user can zoom to.
var DEFAULT_PLACEHOLDER_TAKEUP = 2 / 3; // Placeholder text by default takes up this amount of times of canvas width.
var PINCH_ACCELERATION = 1; // The amount of times by which the pinching is more sensitive than the scolling
// const DEBUG = false
var component = { render: function render() {
    var _vm = this;var _h = _vm.$createElement;var _c = _vm._self._c || _h;return _c('div', { ref: "wrapper", class: 'croppa-container ' + (_vm.img ? 'croppa--has-target' : '') + ' ' + (_vm.disabled ? 'croppa--disabled' : '') + ' ' + (_vm.disableClickToChoose ? 'croppa--disabled-cc' : '') + ' ' + (_vm.disableDragToMove && _vm.disableScrollToZoom ? 'croppa--disabled-mz' : '') + ' ' + (_vm.fileDraggedOver ? 'croppa--dropzone' : ''), on: { "dragenter": function dragenter($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handleDragEnter($event);
        }, "dragleave": function dragleave($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handleDragLeave($event);
        }, "dragover": function dragover($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handleDragOver($event);
        }, "drop": function drop($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handleDrop($event);
        } } }, [_c('input', _vm._b({ ref: "fileInput", staticStyle: { "height": "1px", "width": "1px", "overflow": "hidden", "margin-left": "-99999px", "position": "absolute" }, attrs: { "type": "file", "accept": _vm.accept, "disabled": _vm.disabled }, on: { "change": _vm._handleInputChange } }, 'input', _vm.inputAttrs, false)), _c('div', { staticClass: "slots", staticStyle: { "width": "0", "height": "0", "visibility": "hidden" } }, [_vm._t("initial"), _vm._t("placeholder")], 2), _c('canvas', { ref: "canvas", on: { "click": function click($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handleClick($event);
        }, "touchstart": function touchstart($event) {
          $event.stopPropagation();_vm._handlePointerStart($event);
        }, "mousedown": function mousedown($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerStart($event);
        }, "pointerstart": function pointerstart($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerStart($event);
        }, "touchend": function touchend($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerEnd($event);
        }, "touchcancel": function touchcancel($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerEnd($event);
        }, "mouseup": function mouseup($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerEnd($event);
        }, "pointerend": function pointerend($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerEnd($event);
        }, "pointercancel": function pointercancel($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerEnd($event);
        }, "touchmove": function touchmove($event) {
          $event.stopPropagation();_vm._handlePointerMove($event);
        }, "mousemove": function mousemove($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerMove($event);
        }, "pointermove": function pointermove($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerMove($event);
        }, "pointerleave": function pointerleave($event) {
          $event.stopPropagation();$event.preventDefault();_vm._handlePointerLeave($event);
        }, "DOMMouseScroll": function DOMMouseScroll($event) {
          $event.stopPropagation();_vm._handleWheel($event);
        }, "wheel": function wheel($event) {
          $event.stopPropagation();_vm._handleWheel($event);
        }, "mousewheel": function mousewheel($event) {
          $event.stopPropagation();_vm._handleWheel($event);
        } } }), _vm.showRemoveButton && _vm.img ? _c('svg', { staticClass: "icon icon-remove", style: 'top: -' + _vm.height / 40 + 'px; right: -' + _vm.width / 40 + 'px', attrs: { "viewBox": "0 0 1024 1024", "version": "1.1", "xmlns": "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", "width": _vm.removeButtonSize || _vm.width / 10, "height": _vm.removeButtonSize || _vm.width / 10 }, on: { "click": _vm.remove } }, [_c('path', { attrs: { "d": "M511.921231 0C229.179077 0 0 229.257846 0 512 0 794.702769 229.179077 1024 511.921231 1024 794.781538 1024 1024 794.702769 1024 512 1024 229.257846 794.781538 0 511.921231 0ZM732.041846 650.633846 650.515692 732.081231C650.515692 732.081231 521.491692 593.683692 511.881846 593.683692 502.429538 593.683692 373.366154 732.081231 373.366154 732.081231L291.761231 650.633846C291.761231 650.633846 430.316308 523.500308 430.316308 512.196923 430.316308 500.696615 291.761231 373.523692 291.761231 373.523692L373.366154 291.918769C373.366154 291.918769 503.453538 430.395077 511.881846 430.395077 520.349538 430.395077 650.515692 291.918769 650.515692 291.918769L732.041846 373.523692C732.041846 373.523692 593.447385 502.547692 593.447385 512.196923 593.447385 521.412923 732.041846 650.633846 732.041846 650.633846Z", "fill": _vm.removeButtonColor } })]) : _vm._e()]);
  }, staticRenderFns: [],
  model: {
    prop: 'value',
    event: events.INIT_EVENT
  },
  props: props,
  data: function data() {
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
    };
  },

  computed: {
    outputWidth: function outputWidth() {
      return this.width * this.quality;
    },
    outputHeight: function outputHeight() {
      return this.height * this.quality;
    },
    computedPlaceholderFontSize: function computedPlaceholderFontSize() {
      return this.placeholderFontSize * this.quality;
    },
    aspectRatio: function aspectRatio() {
      return this.naturalWidth / this.naturalHeight;
    }
  },
  mounted: function mounted() {
    this._init();
    u.rAFPolyfill();
    u.toBlobPolyfill();
    var supports = this.supportDetection();
    if (!supports.basic) {
      console.warn('Your browser does not support vue-croppa functionality.');
    }
  },

  watch: {
    outputWidth: function outputWidth() {
      if (!this.hasImage()) {
        this._init();
      } else {
        if (this.preventWhiteSpace) {
          this.imageSet = false;
        }
        this._setSize();
        this._placeImage();
      }
    },
    outputHeight: function outputHeight() {
      if (!this.hasImage()) {
        this._init();
      } else {
        if (this.preventWhiteSpace) {
          this.imageSet = false;
        }
        this._setSize();
        this._placeImage();
      }
    },
    canvasColor: function canvasColor() {
      if (!this.hasImage()) {
        this._init();
      } else {
        this._draw();
      }
    },
    placeholder: function placeholder() {
      if (!this.hasImage()) {
        this._init();
      }
    },
    placeholderColor: function placeholderColor() {
      if (!this.hasImage()) {
        this._init();
      }
    },
    computedPlaceholderFontSize: function computedPlaceholderFontSize() {
      if (!this.hasImage()) {
        this._init();
      }
    },
    preventWhiteSpace: function preventWhiteSpace(val) {
      if (val) {
        this.imageSet = false;
      }
      this._placeImage();
    },
    scaleRatio: function scaleRatio(val, oldVal) {
      if (!this.hasImage()) return;
      if (!u.numberValid(val)) return;
      var x = 1;
      if (u.numberValid(oldVal) && oldVal !== 0) {
        x = val / oldVal;
      }
      var pos = this.currentPointerCoord || {
        x: this.imgData.startX + this.imgData.width / 2,
        y: this.imgData.startY + this.imgData.height / 2
      };
      this.imgData.width = this.naturalWidth * val;
      this.imgData.height = this.naturalHeight * val;
      if (this.preventWhiteSpace) {
        this._preventZoomingToWhiteSpace();
      }
      if (this.userMetadata) return;
      console.log('---------!!!----------');
      var offsetX = (x - 1) * (pos.x - this.imgData.startX);
      var offsetY = (x - 1) * (pos.y - this.imgData.startY);
      this.imgData.startX = this.imgData.startX - offsetX;
      this.imgData.startY = this.imgData.startY - offsetY;
    },

    'imgData.width': function imgDataWidth(val, oldVal) {
      if (!u.numberValid(val)) return;
      this.scaleRatio = val / this.naturalWidth;
      if (this.hasImage()) {
        if (Math.abs(val - oldVal) > val * (1 / 100000)) {
          this.$emit(events.ZOOM_EVENT);
          this._draw();
        }
      }
    },
    'imgData.height': function imgDataHeight(val) {
      if (!u.numberValid(val)) return;
      this.scaleRatio = val / this.naturalHeight;
    }
  },
  methods: {
    getCanvas: function getCanvas() {
      return this.canvas;
    },
    getContext: function getContext() {
      return this.ctx;
    },
    getChosenFile: function getChosenFile() {
      return this.$refs.fileInput.files[0];
    },
    move: function move(offset) {
      if (!offset) return;
      var oldX = this.imgData.startX;
      var oldY = this.imgData.startY;
      this.imgData.startX += offset.x;
      this.imgData.startY += offset.y;
      if (this.preventWhiteSpace) {
        this._preventMovingToWhiteSpace();
      }
      if (this.imgData.startX !== oldX || this.imgData.startY !== oldY) {
        this.$emit(events.MOVE_EVENT);
        this._draw();
      }
    },
    moveUpwards: function moveUpwards() {
      var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      this.move({ x: 0, y: -amount });
    },
    moveDownwards: function moveDownwards() {
      var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      this.move({ x: 0, y: amount });
    },
    moveLeftwards: function moveLeftwards() {
      var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      this.move({ x: -amount, y: 0 });
    },
    moveRightwards: function moveRightwards() {
      var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      this.move({ x: amount, y: 0 });
    },
    zoom: function zoom() {
      var zoomIn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      var acceleration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      var realSpeed = this.zoomSpeed * acceleration;
      var speed = this.outputWidth * PCT_PER_ZOOM * realSpeed;
      var x = 1;
      if (zoomIn) {
        x = 1 + speed;
      } else if (this.imgData.width > MIN_WIDTH) {
        x = 1 - speed;
      }
      this.scaleRatio *= x;
    },
    zoomIn: function zoomIn() {
      this.zoom(true);
    },
    zoomOut: function zoomOut() {
      this.zoom(false);
    },
    rotate: function rotate() {
      var step = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      if (this.disableRotation || this.disabled) return;
      step = parseInt(step);
      if (isNaN(step) || step > 3 || step < -3) {
        console.warn('Invalid argument for rotate() method. It should one of the integers from -3 to 3.');
        step = 1;
      }
      this._rotateByStep(step);
    },
    rotateCCW: function rotateCCW() {
      this.rotateDegrees(-90);
    },
    rotateCW: function rotateCW() {
      this.rotateDegrees(90);
    },
    rotateDegrees: function rotateDegrees(degrees) {
      var _this = this;

      if (!degrees) return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // move to center
      this.ctx.rotate(degrees * Math.PI / 180);

      // special drawing after rotation
      if (!this.img) return;
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () {
          _this._paintBackground();
          _this.ctx.drawImage(_this.img, -_this.canvas.width / 2, -_this.canvas.height / 2, _this.canvas.height, _this.canvas.width);
        });
      } else {
        this._paintBackground();
        this.ctx.drawImage(this.img, -this.canvas.width / 2, -this.canvas.height / 2, this.canvas.height, this.canvas.width);
      }

      this.ctx.translate(-(this.canvas.width / 2), -(this.canvas.height / 2)); // move to top left corner
      this._draw();
      this.$emit(events.ROTATE_EVENT);
    },
    flipX: function flipX() {
      if (this.disableRotation || this.disabled) return;
      this._setOrientation(2);
    },
    flipY: function flipY() {
      if (this.disableRotation || this.disabled) return;
      this._setOrientation(4);
    },
    refresh: function refresh() {
      this.$nextTick(this._init);
    },
    hasImage: function hasImage() {
      return !!this.imageSet;
    },
    applyMetadata: function applyMetadata(metadata) {
      if (!metadata || !this.hasImage()) return;
      this.userMetadata = metadata;
      var ori = metadata.orientation || this.orientation || 1;
      this._setOrientation(ori, true);
    },
    generateDataUrl: function generateDataUrl(type, compressionRate) {
      if (!this.hasImage()) return '';
      return this.canvas.toDataURL(type, compressionRate);
    },
    generateBlob: function generateBlob(callback, mimeType, qualityArgument) {
      if (!this.hasImage()) return null;
      this.canvas.toBlob(callback, mimeType, qualityArgument);
    },
    promisedBlob: function promisedBlob() {
      var _this2 = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (typeof Promise == 'undefined') {
        console.warn('No Promise support. Please add Promise polyfill if you want to use this method.');
        return;
      }
      return new Promise(function (resolve, reject) {
        try {
          _this2.generateBlob(function (blob) {
            resolve(blob);
          }, args);
        } catch (err) {
          reject(err);
        }
      });
    },
    getMetadata: function getMetadata() {
      if (!this.hasImage()) return {};
      var _imgData = this.imgData,
          startX = _imgData.startX,
          startY = _imgData.startY;

      return {
        startX: startX,
        startY: startY,
        scale: this.scaleRatio,
        orientation: this.orientation
      };
    },
    supportDetection: function supportDetection() {
      var div = document.createElement('div');
      return {
        'basic': window.requestAnimationFrame && window.File && window.FileReader && window.FileList && window.Blob,
        'dnd': 'ondragstart' in div && 'ondrop' in div
      };
    },
    chooseFile: function chooseFile() {
      this.$refs.fileInput.click();
    },
    remove: function remove() {
      var ctx = this.ctx;
      this._paintBackground();
      this._setImagePlaceholder();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      var defaultFontSize = this.outputWidth * DEFAULT_PLACEHOLDER_TAKEUP / this.placeholder.length;
      var fontSize = !this.computedPlaceholderFontSize || this.computedPlaceholderFontSize == 0 ? defaultFontSize : this.computedPlaceholderFontSize;
      ctx.font = fontSize + 'px sans-serif';
      ctx.fillStyle = !this.placeholderColor || this.placeholderColor == 'default' ? '#606060' : this.placeholderColor;
      ctx.fillText(this.placeholder, this.outputWidth / 2, this.outputHeight / 2);
      var hadImage = this.img != null;
      this.originalImage = null;
      this.img = null;
      this.$refs.fileInput.value = '';
      this.imgData = {
        width: 0,
        height: 0,
        startX: 0,
        startY: 0
      };
      this.orientation = 1;
      this.scaleRatio = null;
      this.userMetadata = null;
      this.imageSet = false;
      if (hadImage) {
        this.$emit(events.IMAGE_REMOVE_EVENT);
      }
    },
    _init: function _init() {
      this.canvas = this.$refs.canvas;
      this._setSize();
      this.canvas.style.backgroundColor = !this.canvasColor || this.canvasColor == 'default' ? 'transparent' : typeof this.canvasColor === 'string' ? this.canvasColor : '';
      this.ctx = this.canvas.getContext('2d');
      this.originalImage = null;
      this.img = null;
      this.imageSet = false;
      this._setInitial();
      this.$emit(events.INIT_EVENT, this);
    },
    _setSize: function _setSize() {
      this.canvas.width = this.outputWidth;
      this.canvas.height = this.outputHeight;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    },
    _rotateByStep: function _rotateByStep(step) {
      var orientation = 1;
      switch (step) {
        case 1:
          orientation = 6;
          break;
        case 2:
          orientation = 3;
          break;
        case 3:
          orientation = 8;
          break;
        case -1:
          orientation = 8;
          break;
        case -2:
          orientation = 3;
          break;
        case -3:
          orientation = 6;
          break;
      }
      this._setOrientation(orientation);
    },
    _setImagePlaceholder: function _setImagePlaceholder() {
      var _this3 = this;

      var img = void 0;
      if (this.$slots.placeholder && this.$slots.placeholder[0]) {
        var vNode = this.$slots.placeholder[0];
        var tag = vNode.tag,
            elm = vNode.elm;

        if (tag == 'img' && elm) {
          img = elm;
        }
      }
      if (!img) return;
      var onLoad = function onLoad() {
        _this3.ctx.drawImage(img, 0, 0, _this3.outputWidth, _this3.outputHeight);
      };
      if (u.imageLoaded(img)) {
        onLoad();
      } else {
        img.onload = onLoad;
      }
    },
    _setInitial: function _setInitial() {
      var _this4 = this;

      var src = void 0,
          img = void 0;
      if (this.$slots.initial && this.$slots.initial[0]) {
        var vNode = this.$slots.initial[0];
        var tag = vNode.tag,
            elm = vNode.elm;

        if (tag == 'img' && elm) {
          img = elm;
        }
      }
      if (this.initialImage && typeof this.initialImage === 'string') {
        src = this.initialImage;
        img = new Image();
        if (!/^data:/.test(src) && !/^blob:/.test(src)) {
          img.setAttribute('crossOrigin', 'anonymous');
        }
        img.src = src;
      } else if (_typeof(this.initialImage) === 'object' && this.initialImage instanceof Image) {
        img = this.initialImage;
      }
      if (!src && !img) {
        this.remove();
        return;
      }
      if (u.imageLoaded(img)) {
        this.$emit(events.INITIAL_IMAGE_LOADED_EVENT);
        this._onload(img, +img.dataset['exifOrientation']);
      } else {
        img.onload = function () {
          _this4.$emit(events.INITIAL_IMAGE_LOADED_EVENT);
          _this4._onload(img, +img.dataset['exifOrientation']);
        };
        img.onerror = function () {
          _this4.remove();
        };
      }
    },
    _onload: function _onload(img) {
      var orientation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      this.originalImage = img;
      this.img = img;
      if (isNaN(orientation)) {
        orientation = 1;
      }
      this._setOrientation(orientation);
    },
    _handleClick: function _handleClick() {
      if (!this.hasImage() && !this.disableClickToChoose && !this.disabled && !this.supportTouch) {
        this.chooseFile();
      }
    },
    _handleInputChange: function _handleInputChange() {
      var input = this.$refs.fileInput;
      if (!input.files.length) return;
      var file = input.files[0];
      this._onNewFileIn(file);
    },
    _onNewFileIn: function _onNewFileIn(file) {
      var _this5 = this;

      this.$emit(events.FILE_CHOOSE_EVENT, file);
      if (!this._fileSizeIsValid(file)) {
        this.$emit(events.FILE_SIZE_EXCEED_EVENT, file);
        throw new Error('File size exceeds limit which is ' + this.fileSizeLimit + ' bytes.');
      }
      if (!this._fileTypeIsValid(file)) {
        this.$emit(events.FILE_TYPE_MISMATCH_EVENT, file);
        var type = file.type || file.name.toLowerCase().split('.').pop();
        throw new Error('File type (' + type + ') does not match what you specified (' + this.accept + ').');
      }
      if (typeof window.FileReader !== 'undefined') {
        var fr = new FileReader();
        fr.onload = function (e) {
          var fileData = e.target.result;
          var orientation = 1;
          try {
            orientation = u.getFileOrientation(u.base64ToArrayBuffer(fileData));
          } catch (err) {}
          if (orientation < 1) orientation = 1;
          var img = new Image();
          img.src = fileData;
          img.onload = function () {
            _this5._onload(img, orientation);
            _this5.$emit(events.NEW_IMAGE);
          };
        };
        fr.readAsDataURL(file);
      }
    },
    _fileSizeIsValid: function _fileSizeIsValid(file) {
      if (!file) return false;
      if (!this.fileSizeLimit || this.fileSizeLimit == 0) return true;
      return file.size < this.fileSizeLimit;
    },
    _fileTypeIsValid: function _fileTypeIsValid(file) {
      if (!this.accepct) return true;
      var accept = this.accept;
      var baseMimetype = accept.replace(/\/.*$/, '');
      var types = accept.split(',');
      for (var i = 0, len = types.length; i < len; i++) {
        var type = types[i];
        var t = type.trim();
        if (t.charAt(0) == '.') {
          if (file.name.toLowerCase().split('.').pop() === t.toLowerCase().slice(1)) return true;
        } else if (/\/\*$/.test(t)) {
          var fileBaseType = file.type.replace(/\/.*$/, '');
          if (fileBaseType === baseMimetype) {
            return true;
          }
        } else if (file.type === type) {
          return true;
        }
      }
      return false;
    },
    _placeImage: function _placeImage(applyMetadata) {
      if (!this.img) return;
      var imgData = this.imgData;
      this.naturalWidth = this.img.naturalWidth;
      this.naturalHeight = this.img.naturalHeight;
      imgData.startX = u.numberValid(imgData.startX) ? imgData.startX : 0;
      imgData.startY = u.numberValid(imgData.startY) ? imgData.startY : 0;
      if (this.preventWhiteSpace) {
        this._aspectFill();
      } else if (!this.imageSet) {
        if (this.initialSize == 'contain') {
          this._aspectFit();
        } else if (this.initialSize == 'natural') {
          this._naturalSize();
        } else {
          this._aspectFill();
        }
      } else {
        this.imgData.width = this.naturalWidth * this.scaleRatio;
        this.imgData.height = this.naturalHeight * this.scaleRatio;
      }
      if (!this.imageSet) {
        if (/top/.test(this.initialPosition)) {
          imgData.startY = 0;
        } else if (/bottom/.test(this.initialPosition)) {
          imgData.startY = this.outputHeight - imgData.height;
        }
        if (/left/.test(this.initialPosition)) {
          imgData.startX = 0;
        } else if (/right/.test(this.initialPosition)) {
          imgData.startX = this.outputWidth - imgData.width;
        }
        if (/^-?\d+% -?\d+%$/.test(this.initialPosition)) {
          var result = /^(-?\d+)% (-?\d+)%$/.exec(this.initialPosition);
          var x = +result[1] / 100;
          var y = +result[2] / 100;
          imgData.startX = x * (this.outputWidth - imgData.width);
          imgData.startY = y * (this.outputHeight - imgData.height);
        }
      }
      applyMetadata && this._applyMetadata();
      if (applyMetadata && this.preventWhiteSpace) {
        this.zoom(false, 0);
      } else {
        this.move({ x: 0, y: 0 });
        this._draw();
      }
    },
    _aspectFill: function _aspectFill() {
      var imgWidth = this.naturalWidth;
      var imgHeight = this.naturalHeight;
      var canvasRatio = this.outputWidth / this.outputHeight;
      var scaleRatio = void 0;
      if (this.aspectRatio > canvasRatio) {
        scaleRatio = imgHeight / this.outputHeight;
        this.imgData.width = imgWidth / scaleRatio;
        this.imgData.height = this.outputHeight;
        this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2;
        this.imgData.startY = 0;
      } else {
        scaleRatio = imgWidth / this.outputWidth;
        this.imgData.height = imgHeight / scaleRatio;
        this.imgData.width = this.outputWidth;
        this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2;
        this.imgData.startX = 0;
      }
    },
    _aspectFit: function _aspectFit() {
      var imgWidth = this.naturalWidth;
      var imgHeight = this.naturalHeight;
      var canvasRatio = this.outputWidth / this.outputHeight;
      var scaleRatio = void 0;
      if (this.aspectRatio > canvasRatio) {
        scaleRatio = imgWidth / this.outputWidth;
        this.imgData.height = imgHeight / scaleRatio;
        this.imgData.width = this.outputWidth;
        this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2;
      } else {
        scaleRatio = imgHeight / this.outputHeight;
        this.imgData.width = imgWidth / scaleRatio;
        this.imgData.height = this.outputHeight;
        this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2;
      }
    },
    _naturalSize: function _naturalSize() {
      var imgWidth = this.naturalWidth;
      var imgHeight = this.naturalHeight;
      this.imgData.width = imgWidth;
      this.imgData.height = imgHeight;
      this.imgData.startX = -(this.imgData.width - this.outputWidth) / 2;
      this.imgData.startY = -(this.imgData.height - this.outputHeight) / 2;
    },
    _handlePointerStart: function _handlePointerStart(evt) {
      this.supportTouch = true;
      this.pointerMoved = false;
      var pointerCoord = u.getPointerCoords(evt, this);
      this.pointerStartCoord = pointerCoord;
      if (this.disabled) return;
      // simulate click with touch on mobile devices
      if (!this.hasImage() && !this.disableClickToChoose) {
        this.tabStart = new Date().valueOf();
        return;
      }
      // ignore mouse right click and middle click
      if (evt.which && evt.which > 1) return;
      if (!evt.touches || evt.touches.length === 1) {
        this.dragging = true;
        this.pinching = false;
        var coord = u.getPointerCoords(evt, this);
        this.lastMovingCoord = coord;
      }
      if (evt.touches && evt.touches.length === 2 && !this.disablePinchToZoom) {
        this.dragging = false;
        this.pinching = true;
        this.pinchDistance = u.getPinchDistance(evt, this);
      }
      var cancelEvents = ['mouseup', 'touchend', 'touchcancel', 'pointerend', 'pointercancel'];
      for (var i = 0, len = cancelEvents.length; i < len; i++) {
        var e = cancelEvents[i];
        document.addEventListener(e, this._handlePointerEnd);
      }
    },
    _handlePointerEnd: function _handlePointerEnd(evt) {
      var pointerMoveDistance = 0;
      if (this.pointerStartCoord) {
        var pointerCoord = u.getPointerCoords(evt, this);
        pointerMoveDistance = Math.sqrt(Math.pow(pointerCoord.x - this.pointerStartCoord.x, 2) + Math.pow(pointerCoord.y - this.pointerStartCoord.y, 2)) || 0;
      }
      if (this.disabled) return;
      if (!this.hasImage() && !this.disableClickToChoose) {
        var tabEnd = new Date().valueOf();
        if (pointerMoveDistance < CLICK_MOVE_THRESHOLD && tabEnd - this.tabStart < MIN_MS_PER_CLICK && this.supportTouch) {
          this.chooseFile();
        }
        this.tabStart = 0;
        return;
      }
      this.dragging = false;
      this.pinching = false;
      this.pinchDistance = 0;
      this.lastMovingCoord = null;
      this.pointerMoved = false;
      this.pointerStartCoord = null;
    },
    _handlePointerMove: function _handlePointerMove(evt) {
      this.pointerMoved = true;
      if (!this.hasImage()) return;
      var coord = u.getPointerCoords(evt, this);
      this.currentPointerCoord = coord;
      if (this.disabled || this.disableDragToMove) return;
      evt.preventDefault();
      if (!evt.touches || evt.touches.length === 1) {
        if (!this.dragging) return;
        if (this.lastMovingCoord) {
          this.move({
            x: coord.x - this.lastMovingCoord.x,
            y: coord.y - this.lastMovingCoord.y
          });
        }
        this.lastMovingCoord = coord;
      }
      if (evt.touches && evt.touches.length === 2 && !this.disablePinchToZoom) {
        if (!this.pinching) return;
        var distance = u.getPinchDistance(evt, this);
        var delta = distance - this.pinchDistance;
        this.zoom(delta > 0, PINCH_ACCELERATION);
        this.pinchDistance = distance;
      }
    },
    _handlePointerLeave: function _handlePointerLeave() {
      this.currentPointerCoord = null;
    },
    _handleWheel: function _handleWheel(evt) {
      var _this6 = this;

      if (this.disabled || this.disableScrollToZoom || !this.hasImage()) return;
      evt.preventDefault();
      this.scrolling = true;
      if (evt.wheelDelta < 0 || evt.deltaY > 0 || evt.detail > 0) {
        this.zoom(this.reverseScrollToZoom);
      } else if (evt.wheelDelta > 0 || evt.deltaY < 0 || evt.detail < 0) {
        this.zoom(!this.reverseScrollToZoom);
      }
      this.$nextTick(function () {
        _this6.scrolling = false;
      });
    },
    _handleDragEnter: function _handleDragEnter(evt) {
      if (this.disabled || this.disableDragAndDrop || this.hasImage() || !u.eventHasFile(evt)) return;
      this.fileDraggedOver = true;
    },
    _handleDragLeave: function _handleDragLeave(evt) {
      if (!this.fileDraggedOver || !u.eventHasFile(evt)) return;
      this.fileDraggedOver = false;
    },
    _handleDragOver: function _handleDragOver(evt) {},
    _handleDrop: function _handleDrop(evt) {
      if (!this.fileDraggedOver || !u.eventHasFile(evt)) return;
      this.fileDraggedOver = false;
      var file = void 0;
      var dt = evt.dataTransfer;
      if (!dt) return;
      if (dt.items) {
        for (var i = 0, len = dt.items.length; i < len; i++) {
          var item = dt.items[i];
          if (item.kind == 'file') {
            file = item.getAsFile();
            break;
          }
        }
      } else {
        file = dt.files[0];
      }
      if (file) {
        this._onNewFileIn(file);
      }
    },
    _preventMovingToWhiteSpace: function _preventMovingToWhiteSpace() {
      if (this.imgData.startX > 0) {
        this.imgData.startX = 0;
      }
      if (this.imgData.startY > 0) {
        this.imgData.startY = 0;
      }
      if (this.outputWidth - this.imgData.startX > this.imgData.width) {
        this.imgData.startX = -(this.imgData.width - this.outputWidth);
      }
      if (this.outputHeight - this.imgData.startY > this.imgData.height) {
        this.imgData.startY = -(this.imgData.height - this.outputHeight);
      }
    },
    _preventZoomingToWhiteSpace: function _preventZoomingToWhiteSpace() {
      if (this.imgData.width < this.outputWidth) {
        this.scaleRatio = this.outputWidth / this.naturalWidth;
      }
      if (this.imgData.height < this.outputHeight) {
        this.scaleRatio = this.outputHeight / this.naturalHeight;
      }
    },
    _setOrientation: function _setOrientation() {
      var _this7 = this;

      var orientation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 6;
      var applyMetadata = arguments[1];

      if (!this.img) return;
      var useOriginal = applyMetadata && this.userMetadata.orientation !== this.orientation;
      if (orientation > 1 || useOriginal) {
        var _img = u.getRotatedImage(useOriginal ? this.originalImage : this.img, orientation);
        _img.onload = function () {
          _this7.img = _img;
          _this7._placeImage(applyMetadata);
        };
      } else {
        this._placeImage(applyMetadata);
      }
      if (orientation == 2) {
        // flip x
        this.orientation = u.flipX(this.orientation);
      } else if (orientation == 4) {
        // flip y
        this.orientation = u.flipY(this.orientation);
      } else if (orientation == 6) {
        // 90 deg
        this.orientation = u.rotate90(this.orientation);
      } else if (orientation == 3) {
        // 180 deg
        this.orientation = u.rotate90(u.rotate90(this.orientation));
      } else if (orientation == 8) {
        // 270 deg
        this.orientation = u.rotate90(u.rotate90(u.rotate90(this.orientation)));
      } else {
        this.orientation = orientation;
      }
      if (useOriginal) {
        this.orientation = orientation;
      }
    },
    _paintBackground: function _paintBackground() {
      var backgroundColor = !this.canvasColor || this.canvasColor == 'default' ? 'transparent' : this.canvasColor;
      this.ctx.fillStyle = backgroundColor;
      this.ctx.clearRect(0, 0, this.outputWidth, this.outputHeight);
      this.ctx.fillRect(0, 0, this.outputWidth, this.outputHeight);
    },
    _draw: function _draw() {
      var _this8 = this;

      this.$nextTick(function () {
        if (!_this8.img) return;
        if (window.requestAnimationFrame) {
          requestAnimationFrame(_this8._drawFrame);
        } else {
          _this8._drawFrame();
        }
      });
    },
    _drawFrame: function _drawFrame() {
      var ctx = this.ctx;
      var _imgData2 = this.imgData,
          startX = _imgData2.startX,
          startY = _imgData2.startY,
          width = _imgData2.width,
          height = _imgData2.height;

      this._paintBackground();
      ctx.drawImage(this.img, startX, startY, width, height);
      this.$emit(events.DRAW, ctx);
      if (!this.imageSet) {
        this.imageSet = true;
        this.$emit(events.NEW_IMAGE_DRAWN);
      }
    },
    _applyMetadata: function _applyMetadata() {
      var _this9 = this;

      if (!this.userMetadata) return;
      var _userMetadata = this.userMetadata,
          startX = _userMetadata.startX,
          startY = _userMetadata.startY,
          scale = _userMetadata.scale;

      if (u.numberValid(startX)) {
        this.imgData.startX = startX;
      }
      if (u.numberValid(startY)) {
        this.imgData.startY = startY;
      }
      if (u.numberValid(scale)) {
        this.scaleRatio = scale;
      }
      this.$nextTick(function () {
        _this9.userMetadata = null;
      });
    }
  }
};

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

var index = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

var defaultOptions = {
  componentName: 'croppa'
};

var VueCroppa = {
  install: function install(Vue, options) {
    options = index({}, defaultOptions, options);
    var version = Number(Vue.version.split('.')[0]);
    if (version < 2) {
      throw new Error('vue-croppa supports vue version 2.0 and above. You are using Vue@' + version + '. Please upgrade to the latest version of Vue.');
    }
    var componentName = options.componentName || 'croppa';

    // registration
    Vue.component(componentName, component);
  },

  component: component
};

return VueCroppa;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLWNyb3BwYS5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwuanMiLCIuLi8uLi8uLi9zcmMvcHJvcHMuanMiLCIuLi8uLi8uLi9zcmMvZXZlbnRzLmpzIiwiLi4vLi4vLi4vc3JjL2Nyb3BwZXIudnVlIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2FudmFzRXhpZk9yaWVudGF0aW9uIGZyb20gJ2NhbnZhcy1leGlmLW9yaWVudGF0aW9uJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gIG9uZVBvaW50Q29vcmQgKHBvaW50LCB2bSkge1xyXG4gICAgbGV0IHsgY2FudmFzLCBxdWFsaXR5IH0gPSB2bVxyXG4gICAgbGV0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgIGxldCBjbGllbnRYID0gcG9pbnQuY2xpZW50WFxyXG4gICAgbGV0IGNsaWVudFkgPSBwb2ludC5jbGllbnRZXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiAoY2xpZW50WCAtIHJlY3QubGVmdCkgKiBxdWFsaXR5LFxyXG4gICAgICB5OiAoY2xpZW50WSAtIHJlY3QudG9wKSAqIHF1YWxpdHlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBnZXRQb2ludGVyQ29vcmRzIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlclxyXG4gICAgaWYgKGV2dC50b3VjaGVzICYmIGV2dC50b3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQudG91Y2hlc1swXVxyXG4gICAgfSBlbHNlIGlmIChldnQuY2hhbmdlZFRvdWNoZXMgJiYgZXZ0LmNoYW5nZWRUb3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQuY2hhbmdlZFRvdWNoZXNbMF1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnRcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlciwgdm0pXHJcbiAgfSxcclxuXHJcbiAgZ2V0UGluY2hEaXN0YW5jZSAoZXZ0LCB2bSkge1xyXG4gICAgbGV0IHBvaW50ZXIxID0gZXZ0LnRvdWNoZXNbMF1cclxuICAgIGxldCBwb2ludGVyMiA9IGV2dC50b3VjaGVzWzFdXHJcbiAgICBsZXQgY29vcmQxID0gdGhpcy5vbmVQb2ludENvb3JkKHBvaW50ZXIxLCB2bSlcclxuICAgIGxldCBjb29yZDIgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjIsIHZtKVxyXG5cclxuICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coY29vcmQxLnggLSBjb29yZDIueCwgMikgKyBNYXRoLnBvdyhjb29yZDEueSAtIGNvb3JkMi55LCAyKSlcclxuICB9LFxyXG5cclxuICBnZXRQaW5jaENlbnRlckNvb3JkIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlcjEgPSBldnQudG91Y2hlc1swXVxyXG4gICAgbGV0IHBvaW50ZXIyID0gZXZ0LnRvdWNoZXNbMV1cclxuICAgIGxldCBjb29yZDEgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjEsIHZtKVxyXG4gICAgbGV0IGNvb3JkMiA9IHRoaXMub25lUG9pbnRDb29yZChwb2ludGVyMiwgdm0pXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogKGNvb3JkMS54ICsgY29vcmQyLngpIC8gMixcclxuICAgICAgeTogKGNvb3JkMS55ICsgY29vcmQyLnkpIC8gMlxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGltYWdlTG9hZGVkIChpbWcpIHtcclxuICAgIHJldHVybiBpbWcuY29tcGxldGUgJiYgaW1nLm5hdHVyYWxXaWR0aCAhPT0gMFxyXG4gIH0sXHJcblxyXG4gIHJBRlBvbHlmaWxsICgpIHtcclxuICAgIC8vIHJBRiBwb2x5ZmlsbFxyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnKSByZXR1cm5cclxuICAgIHZhciBsYXN0VGltZSA9IDBcclxuICAgIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J11cclxuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCAgICAvLyBXZWJraXTkuK3mraTlj5bmtojmlrnms5XnmoTlkI3lrZflj5jkuoZcclxuICAgICAgICB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKClcclxuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2LjcgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpXHJcbiAgICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGFyZyA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbFxyXG4gICAgICAgICAgY2FsbGJhY2soYXJnKVxyXG4gICAgICAgIH0sIHRpbWVUb0NhbGwpXHJcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGxcclxuICAgICAgICByZXR1cm4gaWRcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uIChhcmcpIHtcclxuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmcpID09PSAnW29iamVjdCBBcnJheV0nXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdG9CbG9iUG9seWZpbGwgKCkge1xyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnIHx8ICFIVE1MQ2FudmFzRWxlbWVudCkgcmV0dXJuXHJcbiAgICB2YXIgYmluU3RyLCBsZW4sIGFyclxyXG4gICAgaWYgKCFIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUudG9CbG9iKSB7XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUsICd0b0Jsb2InLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChjYWxsYmFjaywgdHlwZSwgcXVhbGl0eSkge1xyXG4gICAgICAgICAgYmluU3RyID0gYXRvYih0aGlzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KS5zcGxpdCgnLCcpWzFdKVxyXG4gICAgICAgICAgbGVuID0gYmluU3RyLmxlbmd0aFxyXG4gICAgICAgICAgYXJyID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG5cclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgYXJyW2ldID0gYmluU3RyLmNoYXJDb2RlQXQoaSlcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjYWxsYmFjayhuZXcgQmxvYihbYXJyXSwgeyB0eXBlOiB0eXBlIHx8ICdpbWFnZS9wbmcnIH0pKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBldmVudEhhc0ZpbGUgKGV2dCkge1xyXG4gICAgdmFyIGR0ID0gZXZ0LmRhdGFUcmFuc2ZlciB8fCBldnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXJcclxuICAgIGlmIChkdC50eXBlcykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZHQudHlwZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICBpZiAoZHQudHlwZXNbaV0gPT0gJ0ZpbGVzJykge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9LFxyXG5cclxuICBnZXRGaWxlT3JpZW50YXRpb24gKGFycmF5QnVmZmVyKSB7XHJcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhhcnJheUJ1ZmZlcilcclxuICAgIGlmICh2aWV3LmdldFVpbnQxNigwLCBmYWxzZSkgIT0gMHhGRkQ4KSByZXR1cm4gLTJcclxuICAgIHZhciBsZW5ndGggPSB2aWV3LmJ5dGVMZW5ndGhcclxuICAgIHZhciBvZmZzZXQgPSAyXHJcbiAgICB3aGlsZSAob2Zmc2V0IDwgbGVuZ3RoKSB7XHJcbiAgICAgIHZhciBtYXJrZXIgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICBpZiAobWFya2VyID09IDB4RkZFMSkge1xyXG4gICAgICAgIGlmICh2aWV3LmdldFVpbnQzMihvZmZzZXQgKz0gMiwgZmFsc2UpICE9IDB4NDU3ODY5NjYpIHJldHVybiAtMVxyXG4gICAgICAgIHZhciBsaXR0bGUgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQgKz0gNiwgZmFsc2UpID09IDB4NDk0OVxyXG4gICAgICAgIG9mZnNldCArPSB2aWV3LmdldFVpbnQzMihvZmZzZXQgKyA0LCBsaXR0bGUpXHJcbiAgICAgICAgdmFyIHRhZ3MgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGxpdHRsZSlcclxuICAgICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnczsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAodmlldy5nZXRVaW50MTYob2Zmc2V0ICsgKGkgKiAxMiksIGxpdHRsZSkgPT0gMHgwMTEyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2aWV3LmdldFVpbnQxNihvZmZzZXQgKyAoaSAqIDEyKSArIDgsIGxpdHRsZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAoKG1hcmtlciAmIDB4RkYwMCkgIT0gMHhGRjAwKSBicmVha1xyXG4gICAgICBlbHNlIG9mZnNldCArPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xXHJcbiAgfSxcclxuXHJcbiAgYmFzZTY0VG9BcnJheUJ1ZmZlciAoYmFzZTY0KSB7XHJcbiAgICBiYXNlNjQgPSBiYXNlNjQucmVwbGFjZSgvXmRhdGE6KFteO10rKTtiYXNlNjQsL2dtaSwgJycpXHJcbiAgICB2YXIgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjQpXHJcbiAgICB2YXIgbGVuID0gYmluYXJ5U3RyaW5nLmxlbmd0aFxyXG4gICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnl0ZXMuYnVmZmVyXHJcbiAgfSxcclxuXHJcbiAgZ2V0Um90YXRlZEltYWdlIChpbWcsIG9yaWVudGF0aW9uKSB7XHJcbiAgICB2YXIgX2NhbnZhcyA9IENhbnZhc0V4aWZPcmllbnRhdGlvbi5kcmF3SW1hZ2UoaW1nLCBvcmllbnRhdGlvbilcclxuICAgIHZhciBfaW1nID0gbmV3IEltYWdlKClcclxuICAgIF9pbWcuc3JjID0gX2NhbnZhcy50b0RhdGFVUkwoKVxyXG4gICAgcmV0dXJuIF9pbWdcclxuICB9LFxyXG5cclxuICBmbGlwWCAob3JpKSB7XHJcbiAgICBpZiAob3JpICUgMiA9PSAwKSB7XHJcbiAgICAgIHJldHVybiBvcmkgLSAxXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9yaSArIDFcclxuICB9LFxyXG5cclxuICBmbGlwWSAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDQsXHJcbiAgICAgIDQ6IDEsXHJcbiAgICAgIDI6IDMsXHJcbiAgICAgIDM6IDIsXHJcbiAgICAgIDU6IDgsXHJcbiAgICAgIDg6IDUsXHJcbiAgICAgIDY6IDcsXHJcbiAgICAgIDc6IDZcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICByb3RhdGU5MCAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDYsXHJcbiAgICAgIDI6IDcsXHJcbiAgICAgIDM6IDgsXHJcbiAgICAgIDQ6IDUsXHJcbiAgICAgIDU6IDIsXHJcbiAgICAgIDY6IDMsXHJcbiAgICAgIDc6IDQsXHJcbiAgICAgIDg6IDFcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICBudW1iZXJWYWxpZCAobikge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiAhaXNOYU4obilcclxuICB9XHJcbn0iLCJOdW1iZXIuaXNJbnRlZ2VyID0gTnVtYmVyLmlzSW50ZWdlciB8fCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZSh2YWx1ZSkgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlXHJcbn1cclxuXHJcbnZhciBpbml0aWFsSW1hZ2VUeXBlID0gU3RyaW5nXHJcbmlmICh3aW5kb3cgJiYgd2luZG93LkltYWdlKSB7XHJcbiAgaW5pdGlhbEltYWdlVHlwZSA9IFtTdHJpbmcsIEltYWdlXVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgdmFsdWU6IE9iamVjdCxcclxuICB3aWR0aDoge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMjAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBoZWlnaHQ6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDIwMCxcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGxhY2Vob2xkZXI6IHtcclxuICAgIHR5cGU6IFN0cmluZyxcclxuICAgIGRlZmF1bHQ6ICdDaG9vc2UgYW4gaW1hZ2UnXHJcbiAgfSxcclxuICBwbGFjZWhvbGRlckNvbG9yOiB7XHJcbiAgICBkZWZhdWx0OiAnIzYwNjA2MCdcclxuICB9LFxyXG4gIHBsYWNlaG9sZGVyRm9udFNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDAsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgcmV0dXJuIHZhbCA+PSAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBjYW52YXNDb2xvcjoge1xyXG4gICAgZGVmYXVsdDogJ3RyYW5zcGFyZW50J1xyXG4gIH0sXHJcbiAgcXVhbGl0eToge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMixcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgem9vbVNwZWVkOiB7XHJcbiAgICBkZWZhdWx0OiAzLFxyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBhY2NlcHQ6IFN0cmluZyxcclxuICBmaWxlU2l6ZUxpbWl0OiB7XHJcbiAgICB0eXBlOiBOdW1iZXIsXHJcbiAgICBkZWZhdWx0OiAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPj0gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZGlzYWJsZWQ6IEJvb2xlYW4sXHJcbiAgZGlzYWJsZURyYWdBbmREcm9wOiBCb29sZWFuLFxyXG4gIGRpc2FibGVDbGlja1RvQ2hvb3NlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVEcmFnVG9Nb3ZlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVTY3JvbGxUb1pvb206IEJvb2xlYW4sXHJcbiAgZGlzYWJsZVBpbmNoVG9ab29tOiBCb29sZWFuLFxyXG4gIGRpc2FibGVSb3RhdGlvbjogQm9vbGVhbixcclxuICByZXZlcnNlU2Nyb2xsVG9ab29tOiBCb29sZWFuLFxyXG4gIHByZXZlbnRXaGl0ZVNwYWNlOiBCb29sZWFuLFxyXG4gIHNob3dSZW1vdmVCdXR0b246IHtcclxuICAgIHR5cGU6IEJvb2xlYW4sXHJcbiAgICBkZWZhdWx0OiB0cnVlXHJcbiAgfSxcclxuICByZW1vdmVCdXR0b25Db2xvcjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ3JlZCdcclxuICB9LFxyXG4gIHJlbW92ZUJ1dHRvblNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlclxyXG4gIH0sXHJcbiAgaW5pdGlhbEltYWdlOiBpbml0aWFsSW1hZ2VUeXBlLFxyXG4gIGluaXRpYWxTaXplOiB7XHJcbiAgICB0eXBlOiBTdHJpbmcsXHJcbiAgICBkZWZhdWx0OiAnY292ZXInLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPT09ICdjb3ZlcicgfHwgdmFsID09PSAnY29udGFpbicgfHwgdmFsID09PSAnbmF0dXJhbCdcclxuICAgIH1cclxuICB9LFxyXG4gIGluaXRpYWxQb3NpdGlvbjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ2NlbnRlcicsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgdmFyIHZhbGlkcyA9IFtcclxuICAgICAgICAnY2VudGVyJyxcclxuICAgICAgICAndG9wJyxcclxuICAgICAgICAnYm90dG9tJyxcclxuICAgICAgICAnbGVmdCcsXHJcbiAgICAgICAgJ3JpZ2h0J1xyXG4gICAgICBdXHJcbiAgICAgIHJldHVybiB2YWwuc3BsaXQoJyAnKS5ldmVyeSh3b3JkID0+IHtcclxuICAgICAgICByZXR1cm4gdmFsaWRzLmluZGV4T2Yod29yZCkgPj0gMFxyXG4gICAgICB9KSB8fCAvXi0/XFxkKyUgLT9cXGQrJSQvLnRlc3QodmFsKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgaW5wdXRBdHRyczogT2JqZWN0XHJcbn0iLCJleHBvcnQgZGVmYXVsdCB7XG4gIElOSVRfRVZFTlQ6ICdpbml0JyxcbiAgRklMRV9DSE9PU0VfRVZFTlQ6ICdmaWxlLWNob29zZScsXG4gIEZJTEVfU0laRV9FWENFRURfRVZFTlQ6ICdmaWxlLXNpemUtZXhjZWVkJyxcbiAgRklMRV9UWVBFX01JU01BVENIX0VWRU5UOiAnZmlsZS10eXBlLW1pc21hdGNoJyxcbiAgTkVXX0lNQUdFOiAnbmV3LWltYWdlJyxcbiAgTkVXX0lNQUdFX0RSQVdOOiAnbmV3LWltYWdlLWRyYXduJyxcbiAgSU1BR0VfUkVNT1ZFX0VWRU5UOiAnaW1hZ2UtcmVtb3ZlJyxcbiAgTU9WRV9FVkVOVDogJ21vdmUnLFxuICBST1RBVEVfRVZFTlQ6ICdyb3RhdGUnLFxuICBaT09NX0VWRU5UOiAnem9vbScsXG4gIERSQVc6ICdkcmF3JyxcbiAgSU5JVElBTF9JTUFHRV9MT0FERURfRVZFTlQ6ICdpbml0aWFsLWltYWdlLWxvYWRlZCdcbn1cbiIsIjx0ZW1wbGF0ZT5cclxuICA8ZGl2IHJlZj1cIndyYXBwZXJcIlxyXG4gICAgICAgOmNsYXNzPVwiYGNyb3BwYS1jb250YWluZXIgJHtpbWcgPyAnY3JvcHBhLS1oYXMtdGFyZ2V0JyA6ICcnfSAke2Rpc2FibGVkID8gJ2Nyb3BwYS0tZGlzYWJsZWQnIDogJyd9ICR7ZGlzYWJsZUNsaWNrVG9DaG9vc2UgPyAnY3JvcHBhLS1kaXNhYmxlZC1jYycgOiAnJ30gJHtkaXNhYmxlRHJhZ1RvTW92ZSAmJiBkaXNhYmxlU2Nyb2xsVG9ab29tID8gJ2Nyb3BwYS0tZGlzYWJsZWQtbXonIDogJyd9ICR7ZmlsZURyYWdnZWRPdmVyID8gJ2Nyb3BwYS0tZHJvcHpvbmUnIDogJyd9YFwiXHJcbiAgICAgICBAZHJhZ2VudGVyLnN0b3AucHJldmVudD1cIl9oYW5kbGVEcmFnRW50ZXJcIlxyXG4gICAgICAgQGRyYWdsZWF2ZS5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ0xlYXZlXCJcclxuICAgICAgIEBkcmFnb3Zlci5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ092ZXJcIlxyXG4gICAgICAgQGRyb3Auc3RvcC5wcmV2ZW50PVwiX2hhbmRsZURyb3BcIj5cclxuICAgIDxpbnB1dCB0eXBlPVwiZmlsZVwiXHJcbiAgICAgICAgICAgOmFjY2VwdD1cImFjY2VwdFwiXHJcbiAgICAgICAgICAgOmRpc2FibGVkPVwiZGlzYWJsZWRcIlxyXG4gICAgICAgICAgIHYtYmluZD1cImlucHV0QXR0cnNcIlxyXG4gICAgICAgICAgIHJlZj1cImZpbGVJbnB1dFwiXHJcbiAgICAgICAgICAgQGNoYW5nZT1cIl9oYW5kbGVJbnB1dENoYW5nZVwiXHJcbiAgICAgICAgICAgc3R5bGU9XCJoZWlnaHQ6MXB4O3dpZHRoOjFweDtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWxlZnQ6LTk5OTk5cHg7cG9zaXRpb246YWJzb2x1dGU7XCIgLz5cclxuICAgIDxkaXYgY2xhc3M9XCJzbG90c1wiXHJcbiAgICAgICAgIHN0eWxlPVwid2lkdGg6IDA7IGhlaWdodDogMDsgdmlzaWJpbGl0eTogaGlkZGVuO1wiPlxyXG4gICAgICA8c2xvdCBuYW1lPVwiaW5pdGlhbFwiPjwvc2xvdD5cclxuICAgICAgPHNsb3QgbmFtZT1cInBsYWNlaG9sZGVyXCI+PC9zbG90PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8Y2FudmFzIHJlZj1cImNhbnZhc1wiXHJcbiAgICAgICAgICAgIEBjbGljay5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlQ2xpY2tcIlxyXG4gICAgICAgICAgICBAdG91Y2hzdGFydC5zdG9wPVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBtb3VzZWRvd24uc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBwb2ludGVyc3RhcnQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGVuZC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEBtb3VzZXVwLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyRW5kXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJlbmQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJFbmRcIlxyXG4gICAgICAgICAgICBAcG9pbnRlcmNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaG1vdmUuc3RvcD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBtb3VzZW1vdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJNb3ZlXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJtb3ZlLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBwb2ludGVybGVhdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJMZWF2ZVwiXHJcbiAgICAgICAgICAgIEBET01Nb3VzZVNjcm9sbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCJcclxuICAgICAgICAgICAgQHdoZWVsLnN0b3A9XCJfaGFuZGxlV2hlZWxcIlxyXG4gICAgICAgICAgICBAbW91c2V3aGVlbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCI+PC9jYW52YXM+XHJcbiAgICA8c3ZnIGNsYXNzPVwiaWNvbiBpY29uLXJlbW92ZVwiXHJcbiAgICAgICAgIHYtaWY9XCJzaG93UmVtb3ZlQnV0dG9uICYmIGltZ1wiXHJcbiAgICAgICAgIEBjbGljaz1cInJlbW92ZVwiXHJcbiAgICAgICAgIDpzdHlsZT1cImB0b3A6IC0ke2hlaWdodC80MH1weDsgcmlnaHQ6IC0ke3dpZHRoLzQwfXB4YFwiXHJcbiAgICAgICAgIHZpZXdCb3g9XCIwIDAgMTAyNCAxMDI0XCJcclxuICAgICAgICAgdmVyc2lvbj1cIjEuMVwiXHJcbiAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxyXG4gICAgICAgICB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIlxyXG4gICAgICAgICA6d2lkdGg9XCJyZW1vdmVCdXR0b25TaXplIHx8IHdpZHRoLzEwXCJcclxuICAgICAgICAgOmhlaWdodD1cInJlbW92ZUJ1dHRvblNpemUgfHwgd2lkdGgvMTBcIj5cclxuICAgICAgPHBhdGggZD1cIk01MTEuOTIxMjMxIDBDMjI5LjE3OTA3NyAwIDAgMjI5LjI1Nzg0NiAwIDUxMiAwIDc5NC43MDI3NjkgMjI5LjE3OTA3NyAxMDI0IDUxMS45MjEyMzEgMTAyNCA3OTQuNzgxNTM4IDEwMjQgMTAyNCA3OTQuNzAyNzY5IDEwMjQgNTEyIDEwMjQgMjI5LjI1Nzg0NiA3OTQuNzgxNTM4IDAgNTExLjkyMTIzMSAwWk03MzIuMDQxODQ2IDY1MC42MzM4NDYgNjUwLjUxNTY5MiA3MzIuMDgxMjMxQzY1MC41MTU2OTIgNzMyLjA4MTIzMSA1MjEuNDkxNjkyIDU5My42ODM2OTIgNTExLjg4MTg0NiA1OTMuNjgzNjkyIDUwMi40Mjk1MzggNTkzLjY4MzY5MiAzNzMuMzY2MTU0IDczMi4wODEyMzEgMzczLjM2NjE1NCA3MzIuMDgxMjMxTDI5MS43NjEyMzEgNjUwLjYzMzg0NkMyOTEuNzYxMjMxIDY1MC42MzM4NDYgNDMwLjMxNjMwOCA1MjMuNTAwMzA4IDQzMC4zMTYzMDggNTEyLjE5NjkyMyA0MzAuMzE2MzA4IDUwMC42OTY2MTUgMjkxLjc2MTIzMSAzNzMuNTIzNjkyIDI5MS43NjEyMzEgMzczLjUyMzY5MkwzNzMuMzY2MTU0IDI5MS45MTg3NjlDMzczLjM2NjE1NCAyOTEuOTE4NzY5IDUwMy40NTM1MzggNDMwLjM5NTA3NyA1MTEuODgxODQ2IDQzMC4zOTUwNzcgNTIwLjM0OTUzOCA0MzAuMzk1MDc3IDY1MC41MTU2OTIgMjkxLjkxODc2OSA2NTAuNTE1NjkyIDI5MS45MTg3NjlMNzMyLjA0MTg0NiAzNzMuNTIzNjkyQzczMi4wNDE4NDYgMzczLjUyMzY5MiA1OTMuNDQ3Mzg1IDUwMi41NDc2OTIgNTkzLjQ0NzM4NSA1MTIuMTk2OTIzIDU5My40NDczODUgNTIxLjQxMjkyMyA3MzIuMDQxODQ2IDY1MC42MzM4NDYgNzMyLjA0MTg0NiA2NTAuNjMzODQ2WlwiXHJcbiAgICAgICAgICAgIDpmaWxsPVwicmVtb3ZlQnV0dG9uQ29sb3JcIj48L3BhdGg+XHJcbiAgICA8L3N2Zz5cclxuICA8L2Rpdj5cclxuPC90ZW1wbGF0ZT5cclxuXHJcbjxzY3JpcHQ+XHJcbiAgaW1wb3J0IHUgZnJvbSAnLi91dGlsJ1xyXG4gIGltcG9ydCBwcm9wcyBmcm9tICcuL3Byb3BzJ1xyXG4gIGltcG9ydCBldmVudHMgZnJvbSAnLi9ldmVudHMnXHJcbiAgY29uc3QgUENUX1BFUl9aT09NID0gMSAvIDEwMDAwMCAvLyBUaGUgYW1vdW50IG9mIHpvb21pbmcgZXZlcnl0aW1lIGl0IGhhcHBlbnMsIGluIHBlcmNlbnRhZ2Ugb2YgaW1hZ2Ugd2lkdGguXHJcbiAgY29uc3QgTUlOX01TX1BFUl9DTElDSyA9IDUwMCAvLyBJZiB0b3VjaCBkdXJhdGlvbiBpcyBzaG9ydGVyIHRoYW4gdGhlIHZhbHVlLCB0aGVuIGl0IGlzIGNvbnNpZGVyZWQgYXMgYSBjbGljay5cclxuICBjb25zdCBDTElDS19NT1ZFX1RIUkVTSE9MRCA9IDEwMCAvLyBJZiB0b3VjaCBtb3ZlIGRpc3RhbmNlIGlzIGdyZWF0ZXIgdGhhbiB0aGlzIHZhbHVlLCB0aGVuIGl0IHdpbGwgYnkgbm8gbWVhbiBiZSBjb25zaWRlcmVkIGFzIGEgY2xpY2suXHJcbiAgY29uc3QgTUlOX1dJRFRIID0gMTAgLy8gVGhlIG1pbmltYWwgd2lkdGggdGhlIHVzZXIgY2FuIHpvb20gdG8uXHJcbiAgY29uc3QgREVGQVVMVF9QTEFDRUhPTERFUl9UQUtFVVAgPSAyIC8gMyAvLyBQbGFjZWhvbGRlciB0ZXh0IGJ5IGRlZmF1bHQgdGFrZXMgdXAgdGhpcyBhbW91bnQgb2YgdGltZXMgb2YgY2FudmFzIHdpZHRoLlxyXG4gIGNvbnN0IFBJTkNIX0FDQ0VMRVJBVElPTiA9IDEgLy8gVGhlIGFtb3VudCBvZiB0aW1lcyBieSB3aGljaCB0aGUgcGluY2hpbmcgaXMgbW9yZSBzZW5zaXRpdmUgdGhhbiB0aGUgc2NvbGxpbmdcclxuICAvLyBjb25zdCBERUJVRyA9IGZhbHNlXHJcbiAgZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgbW9kZWw6IHtcclxuICAgICAgcHJvcDogJ3ZhbHVlJyxcclxuICAgICAgZXZlbnQ6IGV2ZW50cy5JTklUX0VWRU5UXHJcbiAgICB9LFxyXG4gICAgcHJvcHM6IHByb3BzLFxyXG4gICAgZGF0YSAoKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY2FudmFzOiBudWxsLFxyXG4gICAgICAgIGN0eDogbnVsbCxcclxuICAgICAgICBvcmlnaW5hbEltYWdlOiBudWxsLFxyXG4gICAgICAgIGltZzogbnVsbCxcclxuICAgICAgICBkcmFnZ2luZzogZmFsc2UsXHJcbiAgICAgICAgbGFzdE1vdmluZ0Nvb3JkOiBudWxsLFxyXG4gICAgICAgIGltZ0RhdGE6IHtcclxuICAgICAgICAgIHdpZHRoOiAwLFxyXG4gICAgICAgICAgaGVpZ2h0OiAwLFxyXG4gICAgICAgICAgc3RhcnRYOiAwLFxyXG4gICAgICAgICAgc3RhcnRZOiAwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWxlRHJhZ2dlZE92ZXI6IGZhbHNlLFxyXG4gICAgICAgIHRhYlN0YXJ0OiAwLFxyXG4gICAgICAgIHNjcm9sbGluZzogZmFsc2UsXHJcbiAgICAgICAgcGluY2hpbmc6IGZhbHNlLFxyXG4gICAgICAgIHBpbmNoRGlzdGFuY2U6IDAsXHJcbiAgICAgICAgc3VwcG9ydFRvdWNoOiBmYWxzZSxcclxuICAgICAgICBwb2ludGVyTW92ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBvaW50ZXJTdGFydENvb3JkOiBudWxsLFxyXG4gICAgICAgIG5hdHVyYWxXaWR0aDogMCxcclxuICAgICAgICBuYXR1cmFsSGVpZ2h0OiAwLFxyXG4gICAgICAgIHNjYWxlUmF0aW86IG51bGwsXHJcbiAgICAgICAgb3JpZW50YXRpb246IDEsXHJcbiAgICAgICAgdXNlck1ldGFkYXRhOiBudWxsLFxyXG4gICAgICAgIGltYWdlU2V0OiBmYWxzZSxcclxuICAgICAgICBjdXJyZW50UG9pbnRlckNvb3JkOiBudWxsXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjb21wdXRlZDoge1xyXG4gICAgICBvdXRwdXRXaWR0aCAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMud2lkdGggKiB0aGlzLnF1YWxpdHlcclxuICAgICAgfSxcclxuICAgICAgb3V0cHV0SGVpZ2h0ICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5oZWlnaHQgKiB0aGlzLnF1YWxpdHlcclxuICAgICAgfSxcclxuICAgICAgY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wbGFjZWhvbGRlckZvbnRTaXplICogdGhpcy5xdWFsaXR5XHJcbiAgICAgIH0sXHJcbiAgICAgIGFzcGVjdFJhdGlvICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsV2lkdGggLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG1vdW50ZWQgKCkge1xyXG4gICAgICB0aGlzLl9pbml0KClcclxuICAgICAgdS5yQUZQb2x5ZmlsbCgpXHJcbiAgICAgIHUudG9CbG9iUG9seWZpbGwoKVxyXG4gICAgICBsZXQgc3VwcG9ydHMgPSB0aGlzLnN1cHBvcnREZXRlY3Rpb24oKVxyXG4gICAgICBpZiAoIXN1cHBvcnRzLmJhc2ljKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB2dWUtY3JvcHBhIGZ1bmN0aW9uYWxpdHkuJylcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIG91dHB1dFdpZHRoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMuX3NldFNpemUoKVxyXG4gICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBvdXRwdXRIZWlnaHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkge1xyXG4gICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmICh0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VTZXQgPSBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhpcy5fc2V0U2l6ZSgpXHJcbiAgICAgICAgICB0aGlzLl9wbGFjZUltYWdlKClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNhbnZhc0NvbG9yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLl9kcmF3KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHBsYWNlaG9sZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgcGxhY2Vob2xkZXJDb2xvcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICB0aGlzLl9pbml0KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICB0aGlzLl9pbml0KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHByZXZlbnRXaGl0ZVNwYWNlICh2YWwpIHtcclxuICAgICAgICBpZiAodmFsKSB7XHJcbiAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgIH0sXHJcbiAgICAgIHNjYWxlUmF0aW8gKHZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgIGlmICghdS5udW1iZXJWYWxpZCh2YWwpKSByZXR1cm5cclxuICAgICAgICB2YXIgeCA9IDFcclxuICAgICAgICBpZiAodS5udW1iZXJWYWxpZChvbGRWYWwpICYmIG9sZFZhbCAhPT0gMCkge1xyXG4gICAgICAgICAgeCA9IHZhbCAvIG9sZFZhbFxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcG9zID0gdGhpcy5jdXJyZW50UG9pbnRlckNvb3JkIHx8IHtcclxuICAgICAgICAgIHg6IHRoaXMuaW1nRGF0YS5zdGFydFggKyB0aGlzLmltZ0RhdGEud2lkdGggLyAyLFxyXG4gICAgICAgICAgeTogdGhpcy5pbWdEYXRhLnN0YXJ0WSArIHRoaXMuaW1nRGF0YS5oZWlnaHQgLyAyXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoICogdmFsXHJcbiAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodCAqIHZhbFxyXG4gICAgICAgIGlmICh0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICB0aGlzLl9wcmV2ZW50Wm9vbWluZ1RvV2hpdGVTcGFjZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnVzZXJNZXRhZGF0YSkgcmV0dXJuXHJcbiAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLSEhIS0tLS0tLS0tLS0nKVxyXG4gICAgICAgIGxldCBvZmZzZXRYID0gKHggLSAxKSAqIChwb3MueCAtIHRoaXMuaW1nRGF0YS5zdGFydFgpXHJcbiAgICAgICAgbGV0IG9mZnNldFkgPSAoeCAtIDEpICogKHBvcy55IC0gdGhpcy5pbWdEYXRhLnN0YXJ0WSlcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gdGhpcy5pbWdEYXRhLnN0YXJ0WCAtIG9mZnNldFhcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gdGhpcy5pbWdEYXRhLnN0YXJ0WSAtIG9mZnNldFlcclxuICAgICAgfSxcclxuICAgICAgJ2ltZ0RhdGEud2lkdGgnOiBmdW5jdGlvbiAodmFsLCBvbGRWYWwpIHtcclxuICAgICAgICBpZiAoIXUubnVtYmVyVmFsaWQodmFsKSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdmFsIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICBpZiAodGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICBpZiAoTWF0aC5hYnModmFsIC0gb2xkVmFsKSA+ICh2YWwgKiAoMSAvIDEwMDAwMCkpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLlpPT01fRVZFTlQpXHJcbiAgICAgICAgICAgIHRoaXMuX2RyYXcoKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgJ2ltZ0RhdGEuaGVpZ2h0JzogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgIGlmICghdS5udW1iZXJWYWxpZCh2YWwpKSByZXR1cm5cclxuICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB2YWwgLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuICAgICAgZ2V0Q2FudmFzICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jYW52YXNcclxuICAgICAgfSxcclxuICAgICAgZ2V0Q29udGV4dCAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3R4XHJcbiAgICAgIH0sXHJcbiAgICAgIGdldENob3NlbkZpbGUgKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRyZWZzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICB9LFxyXG4gICAgICBtb3ZlIChvZmZzZXQpIHtcclxuICAgICAgICBpZiAoIW9mZnNldCkgcmV0dXJuXHJcbiAgICAgICAgbGV0IG9sZFggPSB0aGlzLmltZ0RhdGEuc3RhcnRYXHJcbiAgICAgICAgbGV0IG9sZFkgPSB0aGlzLmltZ0RhdGEuc3RhcnRZXHJcbiAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCArPSBvZmZzZXQueFxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgKz0gb2Zmc2V0LnlcclxuICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgdGhpcy5fcHJldmVudE1vdmluZ1RvV2hpdGVTcGFjZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEuc3RhcnRYICE9PSBvbGRYIHx8IHRoaXMuaW1nRGF0YS5zdGFydFkgIT09IG9sZFkpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk1PVkVfRVZFTlQpXHJcbiAgICAgICAgICB0aGlzLl9kcmF3KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVVcHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogLWFtb3VudCB9KVxyXG4gICAgICB9LFxyXG4gICAgICBtb3ZlRG93bndhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogYW1vdW50IH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVMZWZ0d2FyZHMgKGFtb3VudCA9IDEpIHtcclxuICAgICAgICB0aGlzLm1vdmUoeyB4OiAtYW1vdW50LCB5OiAwIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVSaWdodHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogYW1vdW50LCB5OiAwIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIHpvb20gKHpvb21JbiA9IHRydWUsIGFjY2VsZXJhdGlvbiA9IDEpIHtcclxuICAgICAgICBsZXQgcmVhbFNwZWVkID0gdGhpcy56b29tU3BlZWQgKiBhY2NlbGVyYXRpb25cclxuICAgICAgICBsZXQgc3BlZWQgPSAodGhpcy5vdXRwdXRXaWR0aCAqIFBDVF9QRVJfWk9PTSkgKiByZWFsU3BlZWRcclxuICAgICAgICBsZXQgeCA9IDFcclxuICAgICAgICBpZiAoem9vbUluKSB7XHJcbiAgICAgICAgICB4ID0gMSArIHNwZWVkXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmltZ0RhdGEud2lkdGggPiBNSU5fV0lEVEgpIHtcclxuICAgICAgICAgIHggPSAxIC0gc3BlZWRcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zY2FsZVJhdGlvICo9IHhcclxuICAgICAgfSxcclxuICAgICAgem9vbUluICgpIHtcclxuICAgICAgICB0aGlzLnpvb20odHJ1ZSlcclxuICAgICAgfSxcclxuICAgICAgem9vbU91dCAoKSB7XHJcbiAgICAgICAgdGhpcy56b29tKGZhbHNlKVxyXG4gICAgICB9LFxyXG4gICAgICByb3RhdGUgKHN0ZXAgPSAxKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVJvdGF0aW9uIHx8IHRoaXMuZGlzYWJsZWQpIHJldHVyblxyXG4gICAgICAgIHN0ZXAgPSBwYXJzZUludChzdGVwKVxyXG4gICAgICAgIGlmIChpc05hTihzdGVwKSB8fCBzdGVwID4gMyB8fCBzdGVwIDwgLTMpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybignSW52YWxpZCBhcmd1bWVudCBmb3Igcm90YXRlKCkgbWV0aG9kLiBJdCBzaG91bGQgb25lIG9mIHRoZSBpbnRlZ2VycyBmcm9tIC0zIHRvIDMuJylcclxuICAgICAgICAgIHN0ZXAgPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3JvdGF0ZUJ5U3RlcChzdGVwKVxyXG4gICAgICB9LFxyXG4gICAgICByb3RhdGVDQ1cgKCkge1xyXG4gICAgICAgIHRoaXMucm90YXRlRGVncmVlcygtOTApXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvdGF0ZUNXICgpIHtcclxuICAgICAgICB0aGlzLnJvdGF0ZURlZ3JlZXMoOTApXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvdGF0ZURlZ3JlZXMgKGRlZ3JlZXMpIHtcclxuICAgICAgICBpZiAoIWRlZ3JlZXMpIHJldHVyblxyXG5cclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC50cmFuc2xhdGUodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKSAvLyBtb3ZlIHRvIGNlbnRlclxyXG4gICAgICAgIHRoaXMuY3R4LnJvdGF0ZShkZWdyZWVzICogTWF0aC5QSSAvIDE4MClcclxuXHJcbiAgICAgICAgLy8gc3BlY2lhbCBkcmF3aW5nIGFmdGVyIHJvdGF0aW9uXHJcbiAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuX3BhaW50QmFja2dyb3VuZCgpXHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltZywgLXRoaXMuY2FudmFzLndpZHRoIC8gMiwgLXRoaXMuY2FudmFzLmhlaWdodCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLl9wYWludEJhY2tncm91bmQoKVxyXG4gICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1nLCAtdGhpcy5jYW52YXMud2lkdGggLyAyLCAtdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLmNhbnZhcy53aWR0aClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSgtKHRoaXMuY2FudmFzLndpZHRoIC8gMiksIC0odGhpcy5jYW52YXMuaGVpZ2h0IC8gMikpIC8vIG1vdmUgdG8gdG9wIGxlZnQgY29ybmVyXHJcbiAgICAgICAgdGhpcy5fZHJhdygpXHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuUk9UQVRFX0VWRU5UKVxyXG4gICAgICB9LFxyXG4gICAgICBmbGlwWCAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVJvdGF0aW9uIHx8IHRoaXMuZGlzYWJsZWQpIHJldHVyblxyXG4gICAgICAgIHRoaXMuX3NldE9yaWVudGF0aW9uKDIpXHJcbiAgICAgIH0sXHJcbiAgICAgIGZsaXBZICgpIHtcclxuICAgICAgICBpZiAodGhpcy5kaXNhYmxlUm90YXRpb24gfHwgdGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24oNClcclxuICAgICAgfSxcclxuICAgICAgcmVmcmVzaCAoKSB7XHJcbiAgICAgICAgdGhpcy4kbmV4dFRpY2sodGhpcy5faW5pdClcclxuICAgICAgfSxcclxuICAgICAgaGFzSW1hZ2UgKCkge1xyXG4gICAgICAgIHJldHVybiAhIXRoaXMuaW1hZ2VTZXRcclxuICAgICAgfSxcclxuICAgICAgYXBwbHlNZXRhZGF0YSAobWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAoIW1ldGFkYXRhIHx8ICF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgIHRoaXMudXNlck1ldGFkYXRhID0gbWV0YWRhdGFcclxuICAgICAgICB2YXIgb3JpID0gbWV0YWRhdGEub3JpZW50YXRpb24gfHwgdGhpcy5vcmllbnRhdGlvbiB8fCAxXHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24ob3JpLCB0cnVlKVxyXG4gICAgICB9LFxyXG4gICAgICBnZW5lcmF0ZURhdGFVcmwgKHR5cGUsIGNvbXByZXNzaW9uUmF0ZSkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm4gJydcclxuICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMudG9EYXRhVVJMKHR5cGUsIGNvbXByZXNzaW9uUmF0ZSlcclxuICAgICAgfSxcclxuICAgICAgZ2VuZXJhdGVCbG9iIChjYWxsYmFjaywgbWltZVR5cGUsIHF1YWxpdHlBcmd1bWVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm4gbnVsbFxyXG4gICAgICAgIHRoaXMuY2FudmFzLnRvQmxvYihjYWxsYmFjaywgbWltZVR5cGUsIHF1YWxpdHlBcmd1bWVudClcclxuICAgICAgfSxcclxuICAgICAgcHJvbWlzZWRCbG9iICguLi5hcmdzKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBQcm9taXNlID09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ05vIFByb21pc2Ugc3VwcG9ydC4gUGxlYXNlIGFkZCBQcm9taXNlIHBvbHlmaWxsIGlmIHlvdSB3YW50IHRvIHVzZSB0aGlzIG1ldGhvZC4nKVxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aGlzLmdlbmVyYXRlQmxvYigoYmxvYikgPT4ge1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoYmxvYilcclxuICAgICAgICAgICAgfSwgYXJncylcclxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIGdldE1ldGFkYXRhICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuIHt9XHJcbiAgICAgICAgbGV0IHsgc3RhcnRYLCBzdGFydFkgfSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGFydFgsXHJcbiAgICAgICAgICBzdGFydFksXHJcbiAgICAgICAgICBzY2FsZTogdGhpcy5zY2FsZVJhdGlvLFxyXG4gICAgICAgICAgb3JpZW50YXRpb246IHRoaXMub3JpZW50YXRpb25cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHN1cHBvcnREZXRlY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAnYmFzaWMnOiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICYmIHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYixcclxuICAgICAgICAgICdkbmQnOiAnb25kcmFnc3RhcnQnIGluIGRpdiAmJiAnb25kcm9wJyBpbiBkaXZcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNob29zZUZpbGUgKCkge1xyXG4gICAgICAgIHRoaXMuJHJlZnMuZmlsZUlucHV0LmNsaWNrKClcclxuICAgICAgfSxcclxuICAgICAgcmVtb3ZlICgpIHtcclxuICAgICAgICBsZXQgY3R4ID0gdGhpcy5jdHhcclxuICAgICAgICB0aGlzLl9wYWludEJhY2tncm91bmQoKVxyXG4gICAgICAgIHRoaXMuX3NldEltYWdlUGxhY2Vob2xkZXIoKVxyXG4gICAgICAgIGN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJ1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJ1xyXG4gICAgICAgIGxldCBkZWZhdWx0Rm9udFNpemUgPSB0aGlzLm91dHB1dFdpZHRoICogREVGQVVMVF9QTEFDRUhPTERFUl9UQUtFVVAgLyB0aGlzLnBsYWNlaG9sZGVyLmxlbmd0aFxyXG4gICAgICAgIGxldCBmb250U2l6ZSA9ICghdGhpcy5jb21wdXRlZFBsYWNlaG9sZGVyRm9udFNpemUgfHwgdGhpcy5jb21wdXRlZFBsYWNlaG9sZGVyRm9udFNpemUgPT0gMCkgPyBkZWZhdWx0Rm9udFNpemUgOiB0aGlzLmNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZVxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFNpemUgKyAncHggc2Fucy1zZXJpZidcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gKCF0aGlzLnBsYWNlaG9sZGVyQ29sb3IgfHwgdGhpcy5wbGFjZWhvbGRlckNvbG9yID09ICdkZWZhdWx0JykgPyAnIzYwNjA2MCcgOiB0aGlzLnBsYWNlaG9sZGVyQ29sb3JcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5wbGFjZWhvbGRlciwgdGhpcy5vdXRwdXRXaWR0aCAvIDIsIHRoaXMub3V0cHV0SGVpZ2h0IC8gMilcclxuICAgICAgICBsZXQgaGFkSW1hZ2UgPSB0aGlzLmltZyAhPSBudWxsXHJcbiAgICAgICAgdGhpcy5vcmlnaW5hbEltYWdlID0gbnVsbFxyXG4gICAgICAgIHRoaXMuaW1nID0gbnVsbFxyXG4gICAgICAgIHRoaXMuJHJlZnMuZmlsZUlucHV0LnZhbHVlID0gJydcclxuICAgICAgICB0aGlzLmltZ0RhdGEgPSB7XHJcbiAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgIGhlaWdodDogMCxcclxuICAgICAgICAgIHN0YXJ0WDogMCxcclxuICAgICAgICAgIHN0YXJ0WTogMFxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gMVxyXG4gICAgICAgIHRoaXMuc2NhbGVSYXRpbyA9IG51bGxcclxuICAgICAgICB0aGlzLnVzZXJNZXRhZGF0YSA9IG51bGxcclxuICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICBpZiAoaGFkSW1hZ2UpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLklNQUdFX1JFTU9WRV9FVkVOVClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9pbml0ICgpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcyA9IHRoaXMuJHJlZnMuY2FudmFzXHJcbiAgICAgICAgdGhpcy5fc2V0U2l6ZSgpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gKCF0aGlzLmNhbnZhc0NvbG9yIHx8IHRoaXMuY2FudmFzQ29sb3IgPT0gJ2RlZmF1bHQnKSA/ICd0cmFuc3BhcmVudCcgOiAodHlwZW9mIHRoaXMuY2FudmFzQ29sb3IgPT09ICdzdHJpbmcnID8gdGhpcy5jYW52YXNDb2xvciA6ICcnKVxyXG4gICAgICAgIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxyXG4gICAgICAgIHRoaXMub3JpZ2luYWxJbWFnZSA9IG51bGxcclxuICAgICAgICB0aGlzLmltZyA9IG51bGxcclxuICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICB0aGlzLl9zZXRJbml0aWFsKClcclxuICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUX0VWRU5ULCB0aGlzKVxyXG4gICAgICB9LFxyXG4gICAgICBfc2V0U2l6ZSAoKSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLm91dHB1dFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggKyAncHgnXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyAncHgnXHJcbiAgICAgIH0sXHJcbiAgICAgIF9yb3RhdGVCeVN0ZXAgKHN0ZXApIHtcclxuICAgICAgICBsZXQgb3JpZW50YXRpb24gPSAxXHJcbiAgICAgICAgc3dpdGNoIChzdGVwKSB7XHJcbiAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uID0gNlxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICBvcmllbnRhdGlvbiA9IDNcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgb3JpZW50YXRpb24gPSA4XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICBjYXNlIC0xOlxyXG4gICAgICAgICAgICBvcmllbnRhdGlvbiA9IDhcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIGNhc2UgLTI6XHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uID0gM1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgY2FzZSAtMzpcclxuICAgICAgICAgICAgb3JpZW50YXRpb24gPSA2XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3NldE9yaWVudGF0aW9uKG9yaWVudGF0aW9uKVxyXG4gICAgICB9LFxyXG4gICAgICBfc2V0SW1hZ2VQbGFjZWhvbGRlciAoKSB7XHJcbiAgICAgICAgbGV0IGltZ1xyXG4gICAgICAgIGlmICh0aGlzLiRzbG90cy5wbGFjZWhvbGRlciAmJiB0aGlzLiRzbG90cy5wbGFjZWhvbGRlclswXSkge1xyXG4gICAgICAgICAgbGV0IHZOb2RlID0gdGhpcy4kc2xvdHMucGxhY2Vob2xkZXJbMF1cclxuICAgICAgICAgIGxldCB7IHRhZywgZWxtIH0gPSB2Tm9kZVxyXG4gICAgICAgICAgaWYgKHRhZyA9PSAnaW1nJyAmJiBlbG0pIHtcclxuICAgICAgICAgICAgaW1nID0gZWxtXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghaW1nKSByZXR1cm5cclxuICAgICAgICB2YXIgb25Mb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKGltZywgMCwgMCwgdGhpcy5vdXRwdXRXaWR0aCwgdGhpcy5vdXRwdXRIZWlnaHQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1LmltYWdlTG9hZGVkKGltZykpIHtcclxuICAgICAgICAgIG9uTG9hZCgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGltZy5vbmxvYWQgPSBvbkxvYWRcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9zZXRJbml0aWFsICgpIHtcclxuICAgICAgICBsZXQgc3JjLCBpbWdcclxuICAgICAgICBpZiAodGhpcy4kc2xvdHMuaW5pdGlhbCAmJiB0aGlzLiRzbG90cy5pbml0aWFsWzBdKSB7XHJcbiAgICAgICAgICBsZXQgdk5vZGUgPSB0aGlzLiRzbG90cy5pbml0aWFsWzBdXHJcbiAgICAgICAgICBsZXQgeyB0YWcsIGVsbSB9ID0gdk5vZGVcclxuICAgICAgICAgIGlmICh0YWcgPT0gJ2ltZycgJiYgZWxtKSB7XHJcbiAgICAgICAgICAgIGltZyA9IGVsbVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5pbml0aWFsSW1hZ2UgJiYgdHlwZW9mIHRoaXMuaW5pdGlhbEltYWdlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgc3JjID0gdGhpcy5pbml0aWFsSW1hZ2VcclxuICAgICAgICAgIGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICBpZiAoIS9eZGF0YTovLnRlc3Qoc3JjKSAmJiAhL15ibG9iOi8udGVzdChzcmMpKSB7XHJcbiAgICAgICAgICAgIGltZy5zZXRBdHRyaWJ1dGUoJ2Nyb3NzT3JpZ2luJywgJ2Fub255bW91cycpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpbWcuc3JjID0gc3JjXHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsSW1hZ2UgPT09ICdvYmplY3QnICYmIHRoaXMuaW5pdGlhbEltYWdlIGluc3RhbmNlb2YgSW1hZ2UpIHtcclxuICAgICAgICAgIGltZyA9IHRoaXMuaW5pdGlhbEltYWdlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghc3JjICYmICFpbWcpIHtcclxuICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodS5pbWFnZUxvYWRlZChpbWcpKSB7XHJcbiAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVClcclxuICAgICAgICAgIHRoaXMuX29ubG9hZChpbWcsICtpbWcuZGF0YXNldFsnZXhpZk9yaWVudGF0aW9uJ10pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLklOSVRJQUxfSU1BR0VfTE9BREVEX0VWRU5UKVxyXG4gICAgICAgICAgICB0aGlzLl9vbmxvYWQoaW1nLCAraW1nLmRhdGFzZXRbJ2V4aWZPcmllbnRhdGlvbiddKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaW1nLm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9vbmxvYWQgKGltZywgb3JpZW50YXRpb24gPSAxKSB7XHJcbiAgICAgICAgdGhpcy5vcmlnaW5hbEltYWdlID0gaW1nXHJcbiAgICAgICAgdGhpcy5pbWcgPSBpbWdcclxuICAgICAgICBpZiAoaXNOYU4ob3JpZW50YXRpb24pKSB7XHJcbiAgICAgICAgICBvcmllbnRhdGlvbiA9IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24ob3JpZW50YXRpb24pXHJcbiAgICAgIH0sXHJcbiAgICAgIF9oYW5kbGVDbGljayAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkgJiYgIXRoaXMuZGlzYWJsZUNsaWNrVG9DaG9vc2UgJiYgIXRoaXMuZGlzYWJsZWQgJiYgIXRoaXMuc3VwcG9ydFRvdWNoKSB7XHJcbiAgICAgICAgICB0aGlzLmNob29zZUZpbGUoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZUlucHV0Q2hhbmdlICgpIHtcclxuICAgICAgICBsZXQgaW5wdXQgPSB0aGlzLiRyZWZzLmZpbGVJbnB1dFxyXG4gICAgICAgIGlmICghaW5wdXQuZmlsZXMubGVuZ3RoKSByZXR1cm5cclxuICAgICAgICBsZXQgZmlsZSA9IGlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5fb25OZXdGaWxlSW4oZmlsZSlcclxuICAgICAgfSxcclxuICAgICAgX29uTmV3RmlsZUluIChmaWxlKSB7XHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuRklMRV9DSE9PU0VfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgaWYgKCF0aGlzLl9maWxlU2l6ZUlzVmFsaWQoZmlsZSkpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLkZJTEVfU0laRV9FWENFRURfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgc2l6ZSBleGNlZWRzIGxpbWl0IHdoaWNoIGlzICcgKyB0aGlzLmZpbGVTaXplTGltaXQgKyAnIGJ5dGVzLicpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5fZmlsZVR5cGVJc1ZhbGlkKGZpbGUpKSB7XHJcbiAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5GSUxFX1RZUEVfTUlTTUFUQ0hfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgICBsZXQgdHlwZSA9IGZpbGUudHlwZSB8fCBmaWxlLm5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpLnBvcCgpXHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgdHlwZSAoJHt0eXBlfSkgZG9lcyBub3QgbWF0Y2ggd2hhdCB5b3Ugc3BlY2lmaWVkICgke3RoaXMuYWNjZXB0fSkuYClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cuRmlsZVJlYWRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIGxldCBmciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgICAgICAgIGZyLm9ubG9hZCA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBmaWxlRGF0YSA9IGUudGFyZ2V0LnJlc3VsdFxyXG4gICAgICAgICAgICBsZXQgb3JpZW50YXRpb24gPSAxXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSB1LmdldEZpbGVPcmllbnRhdGlvbih1LmJhc2U2NFRvQXJyYXlCdWZmZXIoZmlsZURhdGEpKVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHsgfVxyXG4gICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPCAxKSBvcmllbnRhdGlvbiA9IDFcclxuICAgICAgICAgICAgbGV0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICAgIGltZy5zcmMgPSBmaWxlRGF0YVxyXG4gICAgICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIHRoaXMuX29ubG9hZChpbWcsIG9yaWVudGF0aW9uKVxyXG4gICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk5FV19JTUFHRSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZnIucmVhZEFzRGF0YVVSTChmaWxlKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2ZpbGVTaXplSXNWYWxpZCAoZmlsZSkge1xyXG4gICAgICAgIGlmICghZmlsZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVTaXplTGltaXQgfHwgdGhpcy5maWxlU2l6ZUxpbWl0ID09IDApIHJldHVybiB0cnVlXHJcbiAgICAgICAgcmV0dXJuIGZpbGUuc2l6ZSA8IHRoaXMuZmlsZVNpemVMaW1pdFxyXG4gICAgICB9LFxyXG4gICAgICBfZmlsZVR5cGVJc1ZhbGlkIChmaWxlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFjY2VwY3QpIHJldHVybiB0cnVlXHJcbiAgICAgICAgbGV0IGFjY2VwdCA9IHRoaXMuYWNjZXB0XHJcbiAgICAgICAgbGV0IGJhc2VNaW1ldHlwZSA9IGFjY2VwdC5yZXBsYWNlKC9cXC8uKiQvLCAnJylcclxuICAgICAgICBsZXQgdHlwZXMgPSBhY2NlcHQuc3BsaXQoJywnKVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0eXBlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgbGV0IHR5cGUgPSB0eXBlc1tpXVxyXG4gICAgICAgICAgbGV0IHQgPSB0eXBlLnRyaW0oKVxyXG4gICAgICAgICAgaWYgKHQuY2hhckF0KDApID09ICcuJykge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5uYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKS5wb3AoKSA9PT0gdC50b0xvd2VyQ2FzZSgpLnNsaWNlKDEpKSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgfSBlbHNlIGlmICgvXFwvXFwqJC8udGVzdCh0KSkge1xyXG4gICAgICAgICAgICB2YXIgZmlsZUJhc2VUeXBlID0gZmlsZS50eXBlLnJlcGxhY2UoL1xcLy4qJC8sICcnKVxyXG4gICAgICAgICAgICBpZiAoZmlsZUJhc2VUeXBlID09PSBiYXNlTWltZXR5cGUpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpbGUudHlwZSA9PT0gdHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgfSxcclxuICAgICAgX3BsYWNlSW1hZ2UgKGFwcGx5TWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW1nKSByZXR1cm5cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHRoaXMubmF0dXJhbFdpZHRoID0gdGhpcy5pbWcubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgdGhpcy5uYXR1cmFsSGVpZ2h0ID0gdGhpcy5pbWcubmF0dXJhbEhlaWdodFxyXG4gICAgICAgIGltZ0RhdGEuc3RhcnRYID0gdS5udW1iZXJWYWxpZChpbWdEYXRhLnN0YXJ0WCkgPyBpbWdEYXRhLnN0YXJ0WCA6IDBcclxuICAgICAgICBpbWdEYXRhLnN0YXJ0WSA9IHUubnVtYmVyVmFsaWQoaW1nRGF0YS5zdGFydFkpID8gaW1nRGF0YS5zdGFydFkgOiAwXHJcbiAgICAgICAgaWYgKHRoaXMucHJldmVudFdoaXRlU3BhY2UpIHtcclxuICAgICAgICAgIHRoaXMuX2FzcGVjdEZpbGwoKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaW1hZ2VTZXQpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmluaXRpYWxTaXplID09ICdjb250YWluJykge1xyXG4gICAgICAgICAgICB0aGlzLl9hc3BlY3RGaXQoKVxyXG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmluaXRpYWxTaXplID09ICduYXR1cmFsJykge1xyXG4gICAgICAgICAgICB0aGlzLl9uYXR1cmFsU2l6ZSgpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9hc3BlY3RGaWxsKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gdGhpcy5uYXR1cmFsV2lkdGggKiB0aGlzLnNjYWxlUmF0aW9cclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSB0aGlzLm5hdHVyYWxIZWlnaHQgKiB0aGlzLnNjYWxlUmF0aW9cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCF0aGlzLmltYWdlU2V0KSB7XHJcbiAgICAgICAgICBpZiAoL3RvcC8udGVzdCh0aGlzLmluaXRpYWxQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgaW1nRGF0YS5zdGFydFkgPSAwXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKC9ib3R0b20vLnRlc3QodGhpcy5pbml0aWFsUG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuc3RhcnRZID0gdGhpcy5vdXRwdXRIZWlnaHQgLSBpbWdEYXRhLmhlaWdodFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKC9sZWZ0Ly50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICAgIH0gZWxzZSBpZiAoL3JpZ2h0Ly50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHRoaXMub3V0cHV0V2lkdGggLSBpbWdEYXRhLndpZHRoXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoL14tP1xcZCslIC0/XFxkKyUkLy50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gL14oLT9cXGQrKSUgKC0/XFxkKyklJC8uZXhlYyh0aGlzLmluaXRpYWxQb3NpdGlvbilcclxuICAgICAgICAgICAgdmFyIHggPSArcmVzdWx0WzFdIC8gMTAwXHJcbiAgICAgICAgICAgIHZhciB5ID0gK3Jlc3VsdFsyXSAvIDEwMFxyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHggKiAodGhpcy5vdXRwdXRXaWR0aCAtIGltZ0RhdGEud2lkdGgpXHJcbiAgICAgICAgICAgIGltZ0RhdGEuc3RhcnRZID0geSAqICh0aGlzLm91dHB1dEhlaWdodCAtIGltZ0RhdGEuaGVpZ2h0KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBhcHBseU1ldGFkYXRhICYmIHRoaXMuX2FwcGx5TWV0YWRhdGEoKVxyXG4gICAgICAgIGlmIChhcHBseU1ldGFkYXRhICYmIHRoaXMucHJldmVudFdoaXRlU3BhY2UpIHtcclxuICAgICAgICAgIHRoaXMuem9vbShmYWxzZSwgMClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgICAgdGhpcy5fZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBfYXNwZWN0RmlsbCAoKSB7XHJcbiAgICAgICAgbGV0IGltZ1dpZHRoID0gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICBsZXQgaW1nSGVpZ2h0ID0gdGhpcy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgbGV0IGNhbnZhc1JhdGlvID0gdGhpcy5vdXRwdXRXaWR0aCAvIHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgbGV0IHNjYWxlUmF0aW9cclxuICAgICAgICBpZiAodGhpcy5hc3BlY3RSYXRpbyA+IGNhbnZhc1JhdGlvKSB7XHJcbiAgICAgICAgICBzY2FsZVJhdGlvID0gaW1nSGVpZ2h0IC8gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IGltZ1dpZHRoIC8gc2NhbGVSYXRpb1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gLSh0aGlzLmltZ0RhdGEud2lkdGggLSB0aGlzLm91dHB1dFdpZHRoKSAvIDJcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSAwXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNjYWxlUmF0aW8gPSBpbWdXaWR0aCAvIHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSBpbWdIZWlnaHQgLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSB0aGlzLm91dHB1dFdpZHRoXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9hc3BlY3RGaXQgKCkge1xyXG4gICAgICAgIGxldCBpbWdXaWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgbGV0IGltZ0hlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodFxyXG4gICAgICAgIGxldCBjYW52YXNSYXRpbyA9IHRoaXMub3V0cHV0V2lkdGggLyB0aGlzLm91dHB1dEhlaWdodFxyXG4gICAgICAgIGxldCBzY2FsZVJhdGlvXHJcbiAgICAgICAgaWYgKHRoaXMuYXNwZWN0UmF0aW8gPiBjYW52YXNSYXRpbykge1xyXG4gICAgICAgICAgc2NhbGVSYXRpbyA9IGltZ1dpZHRoIC8gdGhpcy5vdXRwdXRXaWR0aFxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IGltZ0hlaWdodCAvIHNjYWxlUmF0aW9cclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSAtKHRoaXMuaW1nRGF0YS5oZWlnaHQgLSB0aGlzLm91dHB1dEhlaWdodCkgLyAyXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNjYWxlUmF0aW8gPSBpbWdIZWlnaHQgLyB0aGlzLm91dHB1dEhlaWdodFxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gaW1nV2lkdGggLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuaGVpZ2h0ID0gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFggPSAtKHRoaXMuaW1nRGF0YS53aWR0aCAtIHRoaXMub3V0cHV0V2lkdGgpIC8gMlxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX25hdHVyYWxTaXplICgpIHtcclxuICAgICAgICBsZXQgaW1nV2lkdGggPSB0aGlzLm5hdHVyYWxXaWR0aFxyXG4gICAgICAgIGxldCBpbWdIZWlnaHQgPSB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSBpbWdXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSBpbWdIZWlnaHRcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gLSh0aGlzLmltZ0RhdGEud2lkdGggLSB0aGlzLm91dHB1dFdpZHRoKSAvIDJcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlUG9pbnRlclN0YXJ0IChldnQpIHtcclxuICAgICAgICB0aGlzLnN1cHBvcnRUb3VjaCA9IHRydWVcclxuICAgICAgICB0aGlzLnBvaW50ZXJNb3ZlZCA9IGZhbHNlXHJcbiAgICAgICAgbGV0IHBvaW50ZXJDb29yZCA9IHUuZ2V0UG9pbnRlckNvb3JkcyhldnQsIHRoaXMpXHJcbiAgICAgICAgdGhpcy5wb2ludGVyU3RhcnRDb29yZCA9IHBvaW50ZXJDb29yZFxyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkKSByZXR1cm5cclxuICAgICAgICAvLyBzaW11bGF0ZSBjbGljayB3aXRoIHRvdWNoIG9uIG1vYmlsZSBkZXZpY2VzXHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkgJiYgIXRoaXMuZGlzYWJsZUNsaWNrVG9DaG9vc2UpIHtcclxuICAgICAgICAgIHRoaXMudGFiU3RhcnQgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKVxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGlnbm9yZSBtb3VzZSByaWdodCBjbGljayBhbmQgbWlkZGxlIGNsaWNrXHJcbiAgICAgICAgaWYgKGV2dC53aGljaCAmJiBldnQud2hpY2ggPiAxKSByZXR1cm5cclxuICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgdGhpcy5kcmFnZ2luZyA9IHRydWVcclxuICAgICAgICAgIHRoaXMucGluY2hpbmcgPSBmYWxzZVxyXG4gICAgICAgICAgbGV0IGNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gY29vcmRcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV2dC50b3VjaGVzICYmIGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMiAmJiAhdGhpcy5kaXNhYmxlUGluY2hUb1pvb20pIHtcclxuICAgICAgICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZVxyXG4gICAgICAgICAgdGhpcy5waW5jaGluZyA9IHRydWVcclxuICAgICAgICAgIHRoaXMucGluY2hEaXN0YW5jZSA9IHUuZ2V0UGluY2hEaXN0YW5jZShldnQsIHRoaXMpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjYW5jZWxFdmVudHMgPSBbJ21vdXNldXAnLCAndG91Y2hlbmQnLCAndG91Y2hjYW5jZWwnLCAncG9pbnRlcmVuZCcsICdwb2ludGVyY2FuY2VsJ11cclxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gY2FuY2VsRXZlbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICBsZXQgZSA9IGNhbmNlbEV2ZW50c1tpXVxyXG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihlLCB0aGlzLl9oYW5kbGVQb2ludGVyRW5kKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZVBvaW50ZXJFbmQgKGV2dCkge1xyXG4gICAgICAgIGxldCBwb2ludGVyTW92ZURpc3RhbmNlID0gMFxyXG4gICAgICAgIGlmICh0aGlzLnBvaW50ZXJTdGFydENvb3JkKSB7XHJcbiAgICAgICAgICBsZXQgcG9pbnRlckNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgIHBvaW50ZXJNb3ZlRGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3cocG9pbnRlckNvb3JkLnggLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLngsIDIpICsgTWF0aC5wb3cocG9pbnRlckNvb3JkLnkgLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLnksIDIpKSB8fCAwXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkKSByZXR1cm5cclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSAmJiAhdGhpcy5kaXNhYmxlQ2xpY2tUb0Nob29zZSkge1xyXG4gICAgICAgICAgbGV0IHRhYkVuZCA9IG5ldyBEYXRlKCkudmFsdWVPZigpXHJcbiAgICAgICAgICBpZiAoKHBvaW50ZXJNb3ZlRGlzdGFuY2UgPCBDTElDS19NT1ZFX1RIUkVTSE9MRCkgJiYgdGFiRW5kIC0gdGhpcy50YWJTdGFydCA8IE1JTl9NU19QRVJfQ0xJQ0sgJiYgdGhpcy5zdXBwb3J0VG91Y2gpIHtcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2VGaWxlKClcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMudGFiU3RhcnQgPSAwXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5waW5jaGluZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5waW5jaERpc3RhbmNlID0gMFxyXG4gICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gbnVsbFxyXG4gICAgICAgIHRoaXMucG9pbnRlck1vdmVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLnBvaW50ZXJTdGFydENvb3JkID0gbnVsbFxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlUG9pbnRlck1vdmUgKGV2dCkge1xyXG4gICAgICAgIHRoaXMucG9pbnRlck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm5cclxuICAgICAgICBsZXQgY29vcmQgPSB1LmdldFBvaW50ZXJDb29yZHMoZXZ0LCB0aGlzKVxyXG4gICAgICAgIHRoaXMuY3VycmVudFBvaW50ZXJDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlRHJhZ1RvTW92ZSkgcmV0dXJuXHJcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nKSByZXR1cm5cclxuICAgICAgICAgIGlmICh0aGlzLmxhc3RNb3ZpbmdDb29yZCkge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUoe1xyXG4gICAgICAgICAgICAgIHg6IGNvb3JkLnggLSB0aGlzLmxhc3RNb3ZpbmdDb29yZC54LFxyXG4gICAgICAgICAgICAgIHk6IGNvb3JkLnkgLSB0aGlzLmxhc3RNb3ZpbmdDb29yZC55XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB0aGlzLmxhc3RNb3ZpbmdDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChldnQudG91Y2hlcyAmJiBldnQudG91Y2hlcy5sZW5ndGggPT09IDIgJiYgIXRoaXMuZGlzYWJsZVBpbmNoVG9ab29tKSB7XHJcbiAgICAgICAgICBpZiAoIXRoaXMucGluY2hpbmcpIHJldHVyblxyXG4gICAgICAgICAgbGV0IGRpc3RhbmNlID0gdS5nZXRQaW5jaERpc3RhbmNlKGV2dCwgdGhpcylcclxuICAgICAgICAgIGxldCBkZWx0YSA9IGRpc3RhbmNlIC0gdGhpcy5waW5jaERpc3RhbmNlXHJcbiAgICAgICAgICB0aGlzLnpvb20oZGVsdGEgPiAwLCBQSU5DSF9BQ0NFTEVSQVRJT04pXHJcbiAgICAgICAgICB0aGlzLnBpbmNoRGlzdGFuY2UgPSBkaXN0YW5jZVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZVBvaW50ZXJMZWF2ZSAoKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UG9pbnRlckNvb3JkID0gbnVsbFxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlV2hlZWwgKGV2dCkge1xyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkIHx8IHRoaXMuZGlzYWJsZVNjcm9sbFRvWm9vbSB8fCAhdGhpcy5oYXNJbWFnZSgpKSByZXR1cm5cclxuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgIHRoaXMuc2Nyb2xsaW5nID0gdHJ1ZVxyXG4gICAgICAgIGlmIChldnQud2hlZWxEZWx0YSA8IDAgfHwgZXZ0LmRlbHRhWSA+IDAgfHwgZXZ0LmRldGFpbCA+IDApIHtcclxuICAgICAgICAgIHRoaXMuem9vbSh0aGlzLnJldmVyc2VTY3JvbGxUb1pvb20pXHJcbiAgICAgICAgfSBlbHNlIGlmIChldnQud2hlZWxEZWx0YSA+IDAgfHwgZXZ0LmRlbHRhWSA8IDAgfHwgZXZ0LmRldGFpbCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuem9vbSghdGhpcy5yZXZlcnNlU2Nyb2xsVG9ab29tKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRuZXh0VGljaygoKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnNjcm9sbGluZyA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZURyYWdFbnRlciAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlRHJhZ0FuZERyb3AgfHwgdGhpcy5oYXNJbWFnZSgpIHx8ICF1LmV2ZW50SGFzRmlsZShldnQpKSByZXR1cm5cclxuICAgICAgICB0aGlzLmZpbGVEcmFnZ2VkT3ZlciA9IHRydWVcclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZURyYWdMZWF2ZSAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVEcmFnZ2VkT3ZlciB8fCAhdS5ldmVudEhhc0ZpbGUoZXZ0KSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5maWxlRHJhZ2dlZE92ZXIgPSBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlRHJhZ092ZXIgKGV2dCkge1xyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlRHJvcCAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVEcmFnZ2VkT3ZlciB8fCAhdS5ldmVudEhhc0ZpbGUoZXZ0KSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5maWxlRHJhZ2dlZE92ZXIgPSBmYWxzZVxyXG4gICAgICAgIGxldCBmaWxlXHJcbiAgICAgICAgbGV0IGR0ID0gZXZ0LmRhdGFUcmFuc2ZlclxyXG4gICAgICAgIGlmICghZHQpIHJldHVyblxyXG4gICAgICAgIGlmIChkdC5pdGVtcykge1xyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGR0Lml0ZW1zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtID0gZHQuaXRlbXNbaV1cclxuICAgICAgICAgICAgaWYgKGl0ZW0ua2luZCA9PSAnZmlsZScpIHtcclxuICAgICAgICAgICAgICBmaWxlID0gaXRlbS5nZXRBc0ZpbGUoKVxyXG4gICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZmlsZSA9IGR0LmZpbGVzWzBdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChmaWxlKSB7XHJcbiAgICAgICAgICB0aGlzLl9vbk5ld0ZpbGVJbihmaWxlKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX3ByZXZlbnRNb3ZpbmdUb1doaXRlU3BhY2UgKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEuc3RhcnRYID4gMCkge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS5zdGFydFkgPiAwKSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gMFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5vdXRwdXRXaWR0aCAtIHRoaXMuaW1nRGF0YS5zdGFydFggPiB0aGlzLmltZ0RhdGEud2lkdGgpIHtcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFggPSAtKHRoaXMuaW1nRGF0YS53aWR0aCAtIHRoaXMub3V0cHV0V2lkdGgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLm91dHB1dEhlaWdodCAtIHRoaXMuaW1nRGF0YS5zdGFydFkgPiB0aGlzLmltZ0RhdGEuaGVpZ2h0KSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBfcHJldmVudFpvb21pbmdUb1doaXRlU3BhY2UgKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEud2lkdGggPCB0aGlzLm91dHB1dFdpZHRoKSB7XHJcbiAgICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB0aGlzLm91dHB1dFdpZHRoIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS5oZWlnaHQgPCB0aGlzLm91dHB1dEhlaWdodCkge1xyXG4gICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdGhpcy5vdXRwdXRIZWlnaHQgLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9zZXRPcmllbnRhdGlvbiAob3JpZW50YXRpb24gPSA2LCBhcHBseU1ldGFkYXRhKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgdmFyIHVzZU9yaWdpbmFsID0gYXBwbHlNZXRhZGF0YSAmJiB0aGlzLnVzZXJNZXRhZGF0YS5vcmllbnRhdGlvbiAhPT0gdGhpcy5vcmllbnRhdGlvblxyXG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA+IDEgfHwgdXNlT3JpZ2luYWwpIHtcclxuICAgICAgICAgIHZhciBfaW1nID0gdS5nZXRSb3RhdGVkSW1hZ2UodXNlT3JpZ2luYWwgPyB0aGlzLm9yaWdpbmFsSW1hZ2UgOiB0aGlzLmltZywgb3JpZW50YXRpb24pXHJcbiAgICAgICAgICBfaW1nLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbWcgPSBfaW1nXHJcbiAgICAgICAgICAgIHRoaXMuX3BsYWNlSW1hZ2UoYXBwbHlNZXRhZGF0YSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZShhcHBseU1ldGFkYXRhKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAob3JpZW50YXRpb24gPT0gMikge1xyXG4gICAgICAgICAgLy8gZmxpcCB4XHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5mbGlwWCh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gNCkge1xyXG4gICAgICAgICAgLy8gZmxpcCB5XHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5mbGlwWSh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gNikge1xyXG4gICAgICAgICAgLy8gOTAgZGVnXHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gMykge1xyXG4gICAgICAgICAgLy8gMTgwIGRlZ1xyXG4gICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IHUucm90YXRlOTAodS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKSlcclxuICAgICAgICB9IGVsc2UgaWYgKG9yaWVudGF0aW9uID09IDgpIHtcclxuICAgICAgICAgIC8vIDI3MCBkZWdcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSB1LnJvdGF0ZTkwKHUucm90YXRlOTAodS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKSkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcmllbnRhdGlvblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXNlT3JpZ2luYWwpIHtcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcmllbnRhdGlvblxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX3BhaW50QmFja2dyb3VuZCAoKSB7XHJcbiAgICAgICAgbGV0IGJhY2tncm91bmRDb2xvciA9ICghdGhpcy5jYW52YXNDb2xvciB8fCB0aGlzLmNhbnZhc0NvbG9yID09ICdkZWZhdWx0JykgPyAndHJhbnNwYXJlbnQnIDogdGhpcy5jYW52YXNDb2xvclxyXG4gICAgICAgIHRoaXMuY3R4LmZpbGxTdHlsZSA9IGJhY2tncm91bmRDb2xvclxyXG4gICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLm91dHB1dFdpZHRoLCB0aGlzLm91dHB1dEhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLm91dHB1dFdpZHRoLCB0aGlzLm91dHB1dEhlaWdodClcclxuICAgICAgfSxcclxuICAgICAgX2RyYXcgKCkge1xyXG4gICAgICAgIHRoaXMuJG5leHRUaWNrKCgpID0+IHtcclxuICAgICAgICAgIGlmICghdGhpcy5pbWcpIHJldHVyblxyXG4gICAgICAgICAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2RyYXdGcmFtZSlcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RyYXdGcmFtZSgpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfSxcclxuICAgICAgX2RyYXdGcmFtZSAoKSB7XHJcbiAgICAgICAgbGV0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgbGV0IHsgc3RhcnRYLCBzdGFydFksIHdpZHRoLCBoZWlnaHQgfSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHRoaXMuX3BhaW50QmFja2dyb3VuZCgpXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltZywgc3RhcnRYLCBzdGFydFksIHdpZHRoLCBoZWlnaHQpXHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuRFJBVywgY3R4KVxyXG4gICAgICAgIGlmICghdGhpcy5pbWFnZVNldCkge1xyXG4gICAgICAgICAgdGhpcy5pbWFnZVNldCA9IHRydWVcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk5FV19JTUFHRV9EUkFXTilcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9hcHBseU1ldGFkYXRhICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMudXNlck1ldGFkYXRhKSByZXR1cm5cclxuICAgICAgICB2YXIgeyBzdGFydFgsIHN0YXJ0WSwgc2NhbGUgfSA9IHRoaXMudXNlck1ldGFkYXRhXHJcbiAgICAgICAgaWYgKHUubnVtYmVyVmFsaWQoc3RhcnRYKSkge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IHN0YXJ0WFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodS5udW1iZXJWYWxpZChzdGFydFkpKSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gc3RhcnRZXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1Lm51bWJlclZhbGlkKHNjYWxlKSkge1xyXG4gICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gc2NhbGVcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kbmV4dFRpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy51c2VyTWV0YWRhdGEgPSBudWxsXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuPC9zY3JpcHQ+XHJcblxyXG48c3R5bGUgbGFuZz1cInN0eWx1c1wiPlxyXG4gIC5jcm9wcGEtY29udGFpbmVyXHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2tcclxuICAgIGN1cnNvcjogcG9pbnRlclxyXG4gICAgdHJhbnNpdGlvbjogYWxsIC4zc1xyXG4gICAgcG9zaXRpb246IHJlbGF0aXZlXHJcbiAgICBmb250LXNpemU6IDBcclxuICAgIGFsaWduLXNlbGY6IGZsZXgtc3RhcnRcclxuICAgIGJhY2tncm91bmQtY29sb3I6ICNlNmU2ZTZcclxuICAgIGNhbnZhc1xyXG4gICAgICB0cmFuc2l0aW9uOiBhbGwgLjNzXHJcbiAgICAmOmhvdmVyXHJcbiAgICAgIG9wYWNpdHk6IC43XHJcbiAgICAmLmNyb3BwYS0tZHJvcHpvbmVcclxuICAgICAgYm94LXNoYWRvdzogaW5zZXQgMCAwIDEwcHggbGlnaHRuZXNzKGJsYWNrLCAyMCUpXHJcbiAgICAgIGNhbnZhc1xyXG4gICAgICAgIG9wYWNpdHk6IC41XHJcbiAgICAmLmNyb3BwYS0tZGlzYWJsZWQtY2NcclxuICAgICAgY3Vyc29yOiBkZWZhdWx0XHJcbiAgICAgICY6aG92ZXJcclxuICAgICAgICBvcGFjaXR5OiAxXHJcbiAgICAmLmNyb3BwYS0taGFzLXRhcmdldFxyXG4gICAgICBjdXJzb3I6IG1vdmVcclxuICAgICAgJjpob3ZlclxyXG4gICAgICAgIG9wYWNpdHk6IDFcclxuICAgICAgJi5jcm9wcGEtLWRpc2FibGVkLW16XHJcbiAgICAgICAgY3Vyc29yOiBkZWZhdWx0XHJcbiAgICAmLmNyb3BwYS0tZGlzYWJsZWRcclxuICAgICAgY3Vyc29yOiBub3QtYWxsb3dlZFxyXG4gICAgICAmOmhvdmVyXHJcbiAgICAgICAgb3BhY2l0eTogMVxyXG4gICAgc3ZnLmljb24tcmVtb3ZlXHJcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZVxyXG4gICAgICBiYWNrZ3JvdW5kOiB3aGl0ZVxyXG4gICAgICBib3JkZXItcmFkaXVzOiA1MCVcclxuICAgICAgZmlsdGVyOiBkcm9wLXNoYWRvdygtMnB4IDJweCAycHggcmdiYSgwLCAwLCAwLCAwLjcpKVxyXG4gICAgICB6LWluZGV4OiAxMFxyXG4gICAgICBjdXJzb3I6IHBvaW50ZXJcclxuICAgICAgYm9yZGVyOiAycHggc29saWQgd2hpdGVcclxuPC9zdHlsZT4iLCIvKlxub2JqZWN0LWFzc2lnblxuKGMpIFNpbmRyZSBTb3JodXNcbkBsaWNlbnNlIE1JVFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwiaW1wb3J0IGNvbXBvbmVudCBmcm9tICcuL2Nyb3BwZXIudnVlJ1xyXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXHJcblxyXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcclxuICBjb21wb25lbnROYW1lOiAnY3JvcHBhJ1xyXG59XHJcblxyXG5jb25zdCBWdWVDcm9wcGEgPSB7XHJcbiAgaW5zdGFsbDogZnVuY3Rpb24gKFZ1ZSwgb3B0aW9ucykge1xyXG4gICAgb3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpXHJcbiAgICBsZXQgdmVyc2lvbiA9IE51bWJlcihWdWUudmVyc2lvbi5zcGxpdCgnLicpWzBdKVxyXG4gICAgaWYgKHZlcnNpb24gPCAyKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdnVlLWNyb3BwYSBzdXBwb3J0cyB2dWUgdmVyc2lvbiAyLjAgYW5kIGFib3ZlLiBZb3UgYXJlIHVzaW5nIFZ1ZUAke3ZlcnNpb259LiBQbGVhc2UgdXBncmFkZSB0byB0aGUgbGF0ZXN0IHZlcnNpb24gb2YgVnVlLmApXHJcbiAgICB9XHJcbiAgICBsZXQgY29tcG9uZW50TmFtZSA9IG9wdGlvbnMuY29tcG9uZW50TmFtZSB8fCAnY3JvcHBhJ1xyXG5cclxuICAgIC8vIHJlZ2lzdHJhdGlvblxyXG4gICAgVnVlLmNvbXBvbmVudChjb21wb25lbnROYW1lLCBjb21wb25lbnQpXHJcbiAgfSxcclxuXHJcbiAgY29tcG9uZW50XHJcbn1cclxuZXhwb3J0IGRlZmF1bHQgVnVlQ3JvcHBhIl0sIm5hbWVzIjpbInBvaW50Iiwidm0iLCJjYW52YXMiLCJxdWFsaXR5IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNsaWVudFgiLCJjbGllbnRZIiwibGVmdCIsInRvcCIsImV2dCIsInBvaW50ZXIiLCJ0b3VjaGVzIiwiY2hhbmdlZFRvdWNoZXMiLCJvbmVQb2ludENvb3JkIiwicG9pbnRlcjEiLCJwb2ludGVyMiIsImNvb3JkMSIsImNvb3JkMiIsIk1hdGgiLCJzcXJ0IiwicG93IiwieCIsInkiLCJpbWciLCJjb21wbGV0ZSIsIm5hdHVyYWxXaWR0aCIsImRvY3VtZW50Iiwid2luZG93IiwibGFzdFRpbWUiLCJ2ZW5kb3JzIiwibGVuZ3RoIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsImN1cnJUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJ0aW1lVG9DYWxsIiwibWF4IiwiaWQiLCJzZXRUaW1lb3V0IiwiYXJnIiwiaXNBcnJheSIsIk9iamVjdCIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsIkhUTUxDYW52YXNFbGVtZW50IiwiYmluU3RyIiwibGVuIiwiYXJyIiwidG9CbG9iIiwiZGVmaW5lUHJvcGVydHkiLCJ0eXBlIiwiYXRvYiIsInRvRGF0YVVSTCIsInNwbGl0IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiQmxvYiIsImR0IiwiZGF0YVRyYW5zZmVyIiwib3JpZ2luYWxFdmVudCIsInR5cGVzIiwiYXJyYXlCdWZmZXIiLCJ2aWV3IiwiRGF0YVZpZXciLCJnZXRVaW50MTYiLCJieXRlTGVuZ3RoIiwib2Zmc2V0IiwibWFya2VyIiwiZ2V0VWludDMyIiwibGl0dGxlIiwidGFncyIsImJhc2U2NCIsInJlcGxhY2UiLCJiaW5hcnlTdHJpbmciLCJieXRlcyIsImJ1ZmZlciIsIm9yaWVudGF0aW9uIiwiX2NhbnZhcyIsIkNhbnZhc0V4aWZPcmllbnRhdGlvbiIsImRyYXdJbWFnZSIsIl9pbWciLCJJbWFnZSIsInNyYyIsIm9yaSIsIm1hcCIsIm4iLCJpc05hTiIsIk51bWJlciIsImlzSW50ZWdlciIsInZhbHVlIiwiaXNGaW5pdGUiLCJmbG9vciIsImluaXRpYWxJbWFnZVR5cGUiLCJTdHJpbmciLCJ2YWwiLCJCb29sZWFuIiwidmFsaWRzIiwiZXZlcnkiLCJpbmRleE9mIiwid29yZCIsInRlc3QiLCJQQ1RfUEVSX1pPT00iLCJNSU5fTVNfUEVSX0NMSUNLIiwiQ0xJQ0tfTU9WRV9USFJFU0hPTEQiLCJNSU5fV0lEVEgiLCJERUZBVUxUX1BMQUNFSE9MREVSX1RBS0VVUCIsIlBJTkNIX0FDQ0VMRVJBVElPTiIsInJlbmRlciIsImV2ZW50cyIsIklOSVRfRVZFTlQiLCJwcm9wcyIsIndpZHRoIiwiaGVpZ2h0IiwicGxhY2Vob2xkZXJGb250U2l6ZSIsIm5hdHVyYWxIZWlnaHQiLCJfaW5pdCIsInJBRlBvbHlmaWxsIiwidG9CbG9iUG9seWZpbGwiLCJzdXBwb3J0cyIsInN1cHBvcnREZXRlY3Rpb24iLCJiYXNpYyIsIndhcm4iLCJoYXNJbWFnZSIsInByZXZlbnRXaGl0ZVNwYWNlIiwiaW1hZ2VTZXQiLCJfc2V0U2l6ZSIsIl9wbGFjZUltYWdlIiwiX2RyYXciLCJvbGRWYWwiLCJ1IiwibnVtYmVyVmFsaWQiLCJwb3MiLCJjdXJyZW50UG9pbnRlckNvb3JkIiwiaW1nRGF0YSIsInN0YXJ0WCIsInN0YXJ0WSIsIl9wcmV2ZW50Wm9vbWluZ1RvV2hpdGVTcGFjZSIsInVzZXJNZXRhZGF0YSIsImxvZyIsIm9mZnNldFgiLCJvZmZzZXRZIiwic2NhbGVSYXRpbyIsImFicyIsIiRlbWl0IiwiWk9PTV9FVkVOVCIsImN0eCIsIiRyZWZzIiwiZmlsZUlucHV0IiwiZmlsZXMiLCJvbGRYIiwib2xkWSIsIl9wcmV2ZW50TW92aW5nVG9XaGl0ZVNwYWNlIiwiTU9WRV9FVkVOVCIsImFtb3VudCIsIm1vdmUiLCJ6b29tSW4iLCJhY2NlbGVyYXRpb24iLCJyZWFsU3BlZWQiLCJ6b29tU3BlZWQiLCJzcGVlZCIsIm91dHB1dFdpZHRoIiwiem9vbSIsInN0ZXAiLCJkaXNhYmxlUm90YXRpb24iLCJkaXNhYmxlZCIsInBhcnNlSW50IiwiX3JvdGF0ZUJ5U3RlcCIsInJvdGF0ZURlZ3JlZXMiLCJkZWdyZWVzIiwiY2xlYXJSZWN0IiwidHJhbnNsYXRlIiwicm90YXRlIiwiUEkiLCJfcGFpbnRCYWNrZ3JvdW5kIiwiUk9UQVRFX0VWRU5UIiwiX3NldE9yaWVudGF0aW9uIiwiJG5leHRUaWNrIiwibWV0YWRhdGEiLCJjb21wcmVzc2lvblJhdGUiLCJtaW1lVHlwZSIsInF1YWxpdHlBcmd1bWVudCIsImFyZ3MiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdlbmVyYXRlQmxvYiIsImJsb2IiLCJlcnIiLCJkaXYiLCJjcmVhdGVFbGVtZW50IiwiRmlsZSIsIkZpbGVSZWFkZXIiLCJGaWxlTGlzdCIsImNsaWNrIiwiX3NldEltYWdlUGxhY2Vob2xkZXIiLCJ0ZXh0QmFzZWxpbmUiLCJ0ZXh0QWxpZ24iLCJkZWZhdWx0Rm9udFNpemUiLCJwbGFjZWhvbGRlciIsImZvbnRTaXplIiwiY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplIiwiZm9udCIsImZpbGxTdHlsZSIsInBsYWNlaG9sZGVyQ29sb3IiLCJmaWxsVGV4dCIsIm91dHB1dEhlaWdodCIsImhhZEltYWdlIiwib3JpZ2luYWxJbWFnZSIsIklNQUdFX1JFTU9WRV9FVkVOVCIsInN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiY2FudmFzQ29sb3IiLCJnZXRDb250ZXh0IiwiX3NldEluaXRpYWwiLCIkc2xvdHMiLCJ2Tm9kZSIsInRhZyIsImVsbSIsIm9uTG9hZCIsImltYWdlTG9hZGVkIiwib25sb2FkIiwiaW5pdGlhbCIsImluaXRpYWxJbWFnZSIsInNldEF0dHJpYnV0ZSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJyZW1vdmUiLCJJTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVCIsIl9vbmxvYWQiLCJkYXRhc2V0Iiwib25lcnJvciIsImRpc2FibGVDbGlja1RvQ2hvb3NlIiwic3VwcG9ydFRvdWNoIiwiY2hvb3NlRmlsZSIsImlucHV0IiwiZmlsZSIsIl9vbk5ld0ZpbGVJbiIsIkZJTEVfQ0hPT1NFX0VWRU5UIiwiX2ZpbGVTaXplSXNWYWxpZCIsIkZJTEVfU0laRV9FWENFRURfRVZFTlQiLCJFcnJvciIsImZpbGVTaXplTGltaXQiLCJfZmlsZVR5cGVJc1ZhbGlkIiwiRklMRV9UWVBFX01JU01BVENIX0VWRU5UIiwibmFtZSIsInRvTG93ZXJDYXNlIiwicG9wIiwiYWNjZXB0IiwiZnIiLCJlIiwiZmlsZURhdGEiLCJ0YXJnZXQiLCJyZXN1bHQiLCJnZXRGaWxlT3JpZW50YXRpb24iLCJiYXNlNjRUb0FycmF5QnVmZmVyIiwiTkVXX0lNQUdFIiwicmVhZEFzRGF0YVVSTCIsInNpemUiLCJhY2NlcGN0IiwiYmFzZU1pbWV0eXBlIiwidCIsInRyaW0iLCJjaGFyQXQiLCJzbGljZSIsImZpbGVCYXNlVHlwZSIsImFwcGx5TWV0YWRhdGEiLCJfYXNwZWN0RmlsbCIsImluaXRpYWxTaXplIiwiX2FzcGVjdEZpdCIsIl9uYXR1cmFsU2l6ZSIsImluaXRpYWxQb3NpdGlvbiIsImV4ZWMiLCJfYXBwbHlNZXRhZGF0YSIsImltZ1dpZHRoIiwiaW1nSGVpZ2h0IiwiY2FudmFzUmF0aW8iLCJhc3BlY3RSYXRpbyIsInBvaW50ZXJNb3ZlZCIsInBvaW50ZXJDb29yZCIsImdldFBvaW50ZXJDb29yZHMiLCJwb2ludGVyU3RhcnRDb29yZCIsInRhYlN0YXJ0IiwidmFsdWVPZiIsIndoaWNoIiwiZHJhZ2dpbmciLCJwaW5jaGluZyIsImNvb3JkIiwibGFzdE1vdmluZ0Nvb3JkIiwiZGlzYWJsZVBpbmNoVG9ab29tIiwicGluY2hEaXN0YW5jZSIsImdldFBpbmNoRGlzdGFuY2UiLCJjYW5jZWxFdmVudHMiLCJhZGRFdmVudExpc3RlbmVyIiwiX2hhbmRsZVBvaW50ZXJFbmQiLCJwb2ludGVyTW92ZURpc3RhbmNlIiwidGFiRW5kIiwiZGlzYWJsZURyYWdUb01vdmUiLCJwcmV2ZW50RGVmYXVsdCIsImRpc3RhbmNlIiwiZGVsdGEiLCJkaXNhYmxlU2Nyb2xsVG9ab29tIiwic2Nyb2xsaW5nIiwid2hlZWxEZWx0YSIsImRlbHRhWSIsImRldGFpbCIsInJldmVyc2VTY3JvbGxUb1pvb20iLCJkaXNhYmxlRHJhZ0FuZERyb3AiLCJldmVudEhhc0ZpbGUiLCJmaWxlRHJhZ2dlZE92ZXIiLCJpdGVtcyIsIml0ZW0iLCJraW5kIiwiZ2V0QXNGaWxlIiwidXNlT3JpZ2luYWwiLCJnZXRSb3RhdGVkSW1hZ2UiLCJmbGlwWCIsImZsaXBZIiwicm90YXRlOTAiLCJmaWxsUmVjdCIsIl9kcmF3RnJhbWUiLCJEUkFXIiwiTkVXX0lNQUdFX0RSQVdOIiwic2NhbGUiLCJkZWZhdWx0T3B0aW9ucyIsIlZ1ZUNyb3BwYSIsIlZ1ZSIsIm9wdGlvbnMiLCJhc3NpZ24iLCJ2ZXJzaW9uIiwiY29tcG9uZW50TmFtZSIsImNvbXBvbmVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLFFBQWU7ZUFBQSx5QkFDRUEsS0FERixFQUNTQyxFQURULEVBQ2E7UUFDbEJDLE1BRGtCLEdBQ0VELEVBREYsQ0FDbEJDLE1BRGtCO1FBQ1ZDLE9BRFUsR0FDRUYsRUFERixDQUNWRSxPQURVOztRQUVwQkMsT0FBT0YsT0FBT0cscUJBQVAsRUFBWDtRQUNJQyxVQUFVTixNQUFNTSxPQUFwQjtRQUNJQyxVQUFVUCxNQUFNTyxPQUFwQjtXQUNPO1NBQ0YsQ0FBQ0QsVUFBVUYsS0FBS0ksSUFBaEIsSUFBd0JMLE9BRHRCO1NBRUYsQ0FBQ0ksVUFBVUgsS0FBS0ssR0FBaEIsSUFBdUJOO0tBRjVCO0dBTlc7a0JBQUEsNEJBWUtPLEdBWkwsRUFZVVQsRUFaVixFQVljO1FBQ3JCVSxnQkFBSjtRQUNJRCxJQUFJRSxPQUFKLElBQWVGLElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQW5CLEVBQW1DO2dCQUN2QkYsSUFBSUUsT0FBSixDQUFZLENBQVosQ0FBVjtLQURGLE1BRU8sSUFBSUYsSUFBSUcsY0FBSixJQUFzQkgsSUFBSUcsY0FBSixDQUFtQixDQUFuQixDQUExQixFQUFpRDtnQkFDNUNILElBQUlHLGNBQUosQ0FBbUIsQ0FBbkIsQ0FBVjtLQURLLE1BRUE7Z0JBQ0tILEdBQVY7O1dBRUssS0FBS0ksYUFBTCxDQUFtQkgsT0FBbkIsRUFBNEJWLEVBQTVCLENBQVA7R0FyQlc7a0JBQUEsNEJBd0JLUyxHQXhCTCxFQXdCVVQsRUF4QlYsRUF3QmM7UUFDckJjLFdBQVdMLElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQWY7UUFDSUksV0FBV04sSUFBSUUsT0FBSixDQUFZLENBQVosQ0FBZjtRQUNJSyxTQUFTLEtBQUtILGFBQUwsQ0FBbUJDLFFBQW5CLEVBQTZCZCxFQUE3QixDQUFiO1FBQ0lpQixTQUFTLEtBQUtKLGFBQUwsQ0FBbUJFLFFBQW5CLEVBQTZCZixFQUE3QixDQUFiOztXQUVPa0IsS0FBS0MsSUFBTCxDQUFVRCxLQUFLRSxHQUFMLENBQVNKLE9BQU9LLENBQVAsR0FBV0osT0FBT0ksQ0FBM0IsRUFBOEIsQ0FBOUIsSUFBbUNILEtBQUtFLEdBQUwsQ0FBU0osT0FBT00sQ0FBUCxHQUFXTCxPQUFPSyxDQUEzQixFQUE4QixDQUE5QixDQUE3QyxDQUFQO0dBOUJXO3FCQUFBLCtCQWlDUWIsR0FqQ1IsRUFpQ2FULEVBakNiLEVBaUNpQjtRQUN4QmMsV0FBV0wsSUFBSUUsT0FBSixDQUFZLENBQVosQ0FBZjtRQUNJSSxXQUFXTixJQUFJRSxPQUFKLENBQVksQ0FBWixDQUFmO1FBQ0lLLFNBQVMsS0FBS0gsYUFBTCxDQUFtQkMsUUFBbkIsRUFBNkJkLEVBQTdCLENBQWI7UUFDSWlCLFNBQVMsS0FBS0osYUFBTCxDQUFtQkUsUUFBbkIsRUFBNkJmLEVBQTdCLENBQWI7O1dBRU87U0FDRixDQUFDZ0IsT0FBT0ssQ0FBUCxHQUFXSixPQUFPSSxDQUFuQixJQUF3QixDQUR0QjtTQUVGLENBQUNMLE9BQU9NLENBQVAsR0FBV0wsT0FBT0ssQ0FBbkIsSUFBd0I7S0FGN0I7R0F2Q1c7YUFBQSx1QkE2Q0FDLEdBN0NBLEVBNkNLO1dBQ1RBLElBQUlDLFFBQUosSUFBZ0JELElBQUlFLFlBQUosS0FBcUIsQ0FBNUM7R0E5Q1c7YUFBQSx5QkFpREU7O1FBRVQsT0FBT0MsUUFBUCxJQUFtQixXQUFuQixJQUFrQyxPQUFPQyxNQUFQLElBQWlCLFdBQXZELEVBQW9FO1FBQ2hFQyxXQUFXLENBQWY7UUFDSUMsVUFBVSxDQUFDLFFBQUQsRUFBVyxLQUFYLENBQWQ7U0FDSyxJQUFJUixJQUFJLENBQWIsRUFBZ0JBLElBQUlRLFFBQVFDLE1BQVosSUFBc0IsQ0FBQ0gsT0FBT0kscUJBQTlDLEVBQXFFLEVBQUVWLENBQXZFLEVBQTBFO2FBQ2pFVSxxQkFBUCxHQUErQkosT0FBT0UsUUFBUVIsQ0FBUixJQUFhLHVCQUFwQixDQUEvQjthQUNPVyxvQkFBUCxHQUE4QkwsT0FBT0UsUUFBUVIsQ0FBUixJQUFhLHNCQUFwQjthQUNyQlEsUUFBUVIsQ0FBUixJQUFhLDZCQUFwQixDQURGOzs7UUFJRSxDQUFDTSxPQUFPSSxxQkFBWixFQUFtQzthQUMxQkEscUJBQVAsR0FBK0IsVUFBVUUsUUFBVixFQUFvQjtZQUM3Q0MsV0FBVyxJQUFJQyxJQUFKLEdBQVdDLE9BQVgsRUFBZjtZQUNJQyxhQUFhbkIsS0FBS29CLEdBQUwsQ0FBUyxDQUFULEVBQVksUUFBUUosV0FBV04sUUFBbkIsQ0FBWixDQUFqQjtZQUNJVyxLQUFLWixPQUFPYSxVQUFQLENBQWtCLFlBQVk7Y0FDakNDLE1BQU1QLFdBQVdHLFVBQXJCO21CQUNTSSxHQUFUO1NBRk8sRUFHTkosVUFITSxDQUFUO21CQUlXSCxXQUFXRyxVQUF0QjtlQUNPRSxFQUFQO09BUkY7O1FBV0UsQ0FBQ1osT0FBT0ssb0JBQVosRUFBa0M7YUFDekJBLG9CQUFQLEdBQThCLFVBQVVPLEVBQVYsRUFBYztxQkFDN0JBLEVBQWI7T0FERjs7O1VBS0lHLE9BQU4sR0FBZ0IsVUFBVUQsR0FBVixFQUFlO2FBQ3RCRSxPQUFPQyxTQUFQLENBQWlCQyxRQUFqQixDQUEwQkMsSUFBMUIsQ0FBK0JMLEdBQS9CLE1BQXdDLGdCQUEvQztLQURGO0dBOUVXO2dCQUFBLDRCQW1GSztRQUNaLE9BQU9mLFFBQVAsSUFBbUIsV0FBbkIsSUFBa0MsT0FBT0MsTUFBUCxJQUFpQixXQUFuRCxJQUFrRSxDQUFDb0IsaUJBQXZFLEVBQTBGO1FBQ3RGQyxNQUFKLEVBQVlDLEdBQVosRUFBaUJDLEdBQWpCO1FBQ0ksQ0FBQ0gsa0JBQWtCSCxTQUFsQixDQUE0Qk8sTUFBakMsRUFBeUM7YUFDaENDLGNBQVAsQ0FBc0JMLGtCQUFrQkgsU0FBeEMsRUFBbUQsUUFBbkQsRUFBNkQ7ZUFDcEQsZUFBVVgsUUFBVixFQUFvQm9CLElBQXBCLEVBQTBCbkQsT0FBMUIsRUFBbUM7bUJBQy9Cb0QsS0FBSyxLQUFLQyxTQUFMLENBQWVGLElBQWYsRUFBcUJuRCxPQUFyQixFQUE4QnNELEtBQTlCLENBQW9DLEdBQXBDLEVBQXlDLENBQXpDLENBQUwsQ0FBVDtnQkFDTVIsT0FBT2xCLE1BQWI7Z0JBQ00sSUFBSTJCLFVBQUosQ0FBZVIsR0FBZixDQUFOOztlQUVLLElBQUlTLElBQUksQ0FBYixFQUFnQkEsSUFBSVQsR0FBcEIsRUFBeUJTLEdBQXpCLEVBQThCO2dCQUN4QkEsQ0FBSixJQUFTVixPQUFPVyxVQUFQLENBQWtCRCxDQUFsQixDQUFUOzs7bUJBR08sSUFBSUUsSUFBSixDQUFTLENBQUNWLEdBQUQsQ0FBVCxFQUFnQixFQUFFRyxNQUFNQSxRQUFRLFdBQWhCLEVBQWhCLENBQVQ7O09BVko7O0dBdkZTO2NBQUEsd0JBdUdDNUMsR0F2R0QsRUF1R007UUFDYm9ELEtBQUtwRCxJQUFJcUQsWUFBSixJQUFvQnJELElBQUlzRCxhQUFKLENBQWtCRCxZQUEvQztRQUNJRCxHQUFHRyxLQUFQLEVBQWM7V0FDUCxJQUFJTixJQUFJLENBQVIsRUFBV1QsTUFBTVksR0FBR0csS0FBSCxDQUFTbEMsTUFBL0IsRUFBdUM0QixJQUFJVCxHQUEzQyxFQUFnRFMsR0FBaEQsRUFBcUQ7WUFDL0NHLEdBQUdHLEtBQUgsQ0FBU04sQ0FBVCxLQUFlLE9BQW5CLEVBQTRCO2lCQUNuQixJQUFQOzs7OztXQUtDLEtBQVA7R0FqSFc7b0JBQUEsOEJBb0hPTyxXQXBIUCxFQW9Ib0I7UUFDM0JDLE9BQU8sSUFBSUMsUUFBSixDQUFhRixXQUFiLENBQVg7UUFDSUMsS0FBS0UsU0FBTCxDQUFlLENBQWYsRUFBa0IsS0FBbEIsS0FBNEIsTUFBaEMsRUFBd0MsT0FBTyxDQUFDLENBQVI7UUFDcEN0QyxTQUFTb0MsS0FBS0csVUFBbEI7UUFDSUMsU0FBUyxDQUFiO1dBQ09BLFNBQVN4QyxNQUFoQixFQUF3QjtVQUNsQnlDLFNBQVNMLEtBQUtFLFNBQUwsQ0FBZUUsTUFBZixFQUF1QixLQUF2QixDQUFiO2dCQUNVLENBQVY7VUFDSUMsVUFBVSxNQUFkLEVBQXNCO1lBQ2hCTCxLQUFLTSxTQUFMLENBQWVGLFVBQVUsQ0FBekIsRUFBNEIsS0FBNUIsS0FBc0MsVUFBMUMsRUFBc0QsT0FBTyxDQUFDLENBQVI7WUFDbERHLFNBQVNQLEtBQUtFLFNBQUwsQ0FBZUUsVUFBVSxDQUF6QixFQUE0QixLQUE1QixLQUFzQyxNQUFuRDtrQkFDVUosS0FBS00sU0FBTCxDQUFlRixTQUFTLENBQXhCLEVBQTJCRyxNQUEzQixDQUFWO1lBQ0lDLE9BQU9SLEtBQUtFLFNBQUwsQ0FBZUUsTUFBZixFQUF1QkcsTUFBdkIsQ0FBWDtrQkFDVSxDQUFWO2FBQ0ssSUFBSWYsSUFBSSxDQUFiLEVBQWdCQSxJQUFJZ0IsSUFBcEIsRUFBMEJoQixHQUExQixFQUErQjtjQUN6QlEsS0FBS0UsU0FBTCxDQUFlRSxTQUFVWixJQUFJLEVBQTdCLEVBQWtDZSxNQUFsQyxLQUE2QyxNQUFqRCxFQUF5RDttQkFDaERQLEtBQUtFLFNBQUwsQ0FBZUUsU0FBVVosSUFBSSxFQUFkLEdBQW9CLENBQW5DLEVBQXNDZSxNQUF0QyxDQUFQOzs7T0FSTixNQVdPLElBQUksQ0FBQ0YsU0FBUyxNQUFWLEtBQXFCLE1BQXpCLEVBQWlDLE1BQWpDLEtBQ0ZELFVBQVVKLEtBQUtFLFNBQUwsQ0FBZUUsTUFBZixFQUF1QixLQUF2QixDQUFWOztXQUVBLENBQUMsQ0FBUjtHQTFJVztxQkFBQSwrQkE2SVFLLE1BN0lSLEVBNklnQjthQUNsQkEsT0FBT0MsT0FBUCxDQUFlLDBCQUFmLEVBQTJDLEVBQTNDLENBQVQ7UUFDSUMsZUFBZXZCLEtBQUtxQixNQUFMLENBQW5CO1FBQ0kxQixNQUFNNEIsYUFBYS9DLE1BQXZCO1FBQ0lnRCxRQUFRLElBQUlyQixVQUFKLENBQWVSLEdBQWYsQ0FBWjtTQUNLLElBQUlTLElBQUksQ0FBYixFQUFnQkEsSUFBSVQsR0FBcEIsRUFBeUJTLEdBQXpCLEVBQThCO1lBQ3RCQSxDQUFOLElBQVdtQixhQUFhbEIsVUFBYixDQUF3QkQsQ0FBeEIsQ0FBWDs7V0FFS29CLE1BQU1DLE1BQWI7R0FySlc7aUJBQUEsMkJBd0pJeEQsR0F4SkosRUF3SlN5RCxXQXhKVCxFQXdKc0I7UUFDN0JDLFVBQVVDLHNCQUFzQkMsU0FBdEIsQ0FBZ0M1RCxHQUFoQyxFQUFxQ3lELFdBQXJDLENBQWQ7UUFDSUksT0FBTyxJQUFJQyxLQUFKLEVBQVg7U0FDS0MsR0FBTCxHQUFXTCxRQUFRMUIsU0FBUixFQUFYO1dBQ082QixJQUFQO0dBNUpXO09BQUEsaUJBK0pORyxHQS9KTSxFQStKRDtRQUNOQSxNQUFNLENBQU4sSUFBVyxDQUFmLEVBQWtCO2FBQ1RBLE1BQU0sQ0FBYjs7O1dBR0tBLE1BQU0sQ0FBYjtHQXBLVztPQUFBLGlCQXVLTkEsR0F2S00sRUF1S0Q7UUFDSkMsTUFBTTtTQUNQLENBRE87U0FFUCxDQUZPO1NBR1AsQ0FITztTQUlQLENBSk87U0FLUCxDQUxPO1NBTVAsQ0FOTztTQU9QLENBUE87U0FRUDtLQVJMOztXQVdPQSxJQUFJRCxHQUFKLENBQVA7R0FuTFc7VUFBQSxvQkFzTEhBLEdBdExHLEVBc0xFO1FBQ1BDLE1BQU07U0FDUCxDQURPO1NBRVAsQ0FGTztTQUdQLENBSE87U0FJUCxDQUpPO1NBS1AsQ0FMTztTQU1QLENBTk87U0FPUCxDQVBPO1NBUVA7S0FSTDs7V0FXT0EsSUFBSUQsR0FBSixDQUFQO0dBbE1XO2FBQUEsdUJBcU1BRSxDQXJNQSxFQXFNRztXQUNQLE9BQU9BLENBQVAsS0FBYSxRQUFiLElBQXlCLENBQUNDLE1BQU1ELENBQU4sQ0FBakM7O0NBdE1KOztBQ0ZBRSxPQUFPQyxTQUFQLEdBQW1CRCxPQUFPQyxTQUFQLElBQW9CLFVBQVVDLEtBQVYsRUFBaUI7U0FDL0MsT0FBT0EsS0FBUCxLQUFpQixRQUFqQixJQUE2QkMsU0FBU0QsS0FBVCxDQUE3QixJQUFnRDNFLEtBQUs2RSxLQUFMLENBQVdGLEtBQVgsTUFBc0JBLEtBQTdFO0NBREY7O0FBSUEsSUFBSUcsbUJBQW1CQyxNQUF2QjtBQUNBLElBQUl0RSxVQUFVQSxPQUFPMEQsS0FBckIsRUFBNEI7cUJBQ1AsQ0FBQ1ksTUFBRCxFQUFTWixLQUFULENBQW5COzs7QUFHRixZQUFlO1NBQ04xQyxNQURNO1NBRU47VUFDQ2dELE1BREQ7YUFFSSxHQUZKO2VBR00sbUJBQVVPLEdBQVYsRUFBZTthQUNqQkEsTUFBTSxDQUFiOztHQU5TO1VBU0w7VUFDQVAsTUFEQTthQUVHLEdBRkg7ZUFHSyxtQkFBVU8sR0FBVixFQUFlO2FBQ2pCQSxNQUFNLENBQWI7O0dBYlM7ZUFnQkE7VUFDTEQsTUFESzthQUVGO0dBbEJFO29CQW9CSzthQUNQO0dBckJFO3VCQXVCUTtVQUNiTixNQURhO2FBRVYsQ0FGVTtlQUdSLG1CQUFVTyxHQUFWLEVBQWU7YUFDakJBLE9BQU8sQ0FBZDs7R0EzQlM7ZUE4QkE7YUFDRjtHQS9CRTtXQWlDSjtVQUNEUCxNQURDO2FBRUUsQ0FGRjtlQUdJLG1CQUFVTyxHQUFWLEVBQWU7YUFDakJBLE1BQU0sQ0FBYjs7R0FyQ1M7YUF3Q0Y7YUFDQSxDQURBO1VBRUhQLE1BRkc7ZUFHRSxtQkFBVU8sR0FBVixFQUFlO2FBQ2pCQSxNQUFNLENBQWI7O0dBNUNTO1VBK0NMRCxNQS9DSztpQkFnREU7VUFDUE4sTUFETzthQUVKLENBRkk7ZUFHRixtQkFBVU8sR0FBVixFQUFlO2FBQ2pCQSxPQUFPLENBQWQ7O0dBcERTO1lBdURIQyxPQXZERztzQkF3RE9BLE9BeERQO3dCQXlEU0EsT0F6RFQ7cUJBMERNQSxPQTFETjt1QkEyRFFBLE9BM0RSO3NCQTRET0EsT0E1RFA7bUJBNkRJQSxPQTdESjt1QkE4RFFBLE9BOURSO3FCQStETUEsT0EvRE47b0JBZ0VLO1VBQ1ZBLE9BRFU7YUFFUDtHQWxFRTtxQkFvRU07VUFDWEYsTUFEVzthQUVSO0dBdEVFO29CQXdFSztVQUNWTjtHQXpFSztnQkEyRUNLLGdCQTNFRDtlQTRFQTtVQUNMQyxNQURLO2FBRUYsT0FGRTtlQUdBLG1CQUFVQyxHQUFWLEVBQWU7YUFDakJBLFFBQVEsT0FBUixJQUFtQkEsUUFBUSxTQUEzQixJQUF3Q0EsUUFBUSxTQUF2RDs7R0FoRlM7bUJBbUZJO1VBQ1RELE1BRFM7YUFFTixRQUZNO2VBR0osbUJBQVVDLEdBQVYsRUFBZTtVQUNwQkUsU0FBUyxDQUNYLFFBRFcsRUFFWCxLQUZXLEVBR1gsUUFIVyxFQUlYLE1BSlcsRUFLWCxPQUxXLENBQWI7YUFPT0YsSUFBSTFDLEtBQUosQ0FBVSxHQUFWLEVBQWU2QyxLQUFmLENBQXFCLGdCQUFRO2VBQzNCRCxPQUFPRSxPQUFQLENBQWVDLElBQWYsS0FBd0IsQ0FBL0I7T0FESyxLQUVELGtCQUFrQkMsSUFBbEIsQ0FBdUJOLEdBQXZCLENBRk47O0dBOUZTO2NBbUdEdkQ7Q0FuR2Q7O0FDVEEsYUFBZTtjQUNELE1BREM7cUJBRU0sYUFGTjswQkFHVyxrQkFIWDs0QkFJYSxvQkFKYjthQUtGLFdBTEU7bUJBTUksaUJBTko7c0JBT08sY0FQUDtjQVFELE1BUkM7Z0JBU0MsUUFURDtjQVVELE1BVkM7UUFXUCxNQVhPOzhCQVllO0NBWjlCOzs7Ozs7OztBQ3dEQSxJQUFNOEQsZUFBZSxJQUFJLE1BQXpCO0FBQ0EsSUFBTUMsbUJBQW1CLEdBQXpCO0FBQ0EsSUFBTUMsdUJBQXVCLEdBQTdCO0FBQ0EsSUFBTUMsWUFBWSxFQUFsQjtBQUNBLElBQU1DLDZCQUE2QixJQUFJLENBQXZDO0FBQ0EsSUFBTUMscUJBQXFCLENBQTNCOztBQUVBLGdCQUFlLEVBQUNDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FBRCxxQkFBQTtTQUNOO1VBQ0MsT0FERDtXQUVFQyxPQUFPQztHQUhIO1NBS05DLEtBTE07TUFBQSxrQkFNTDtXQUNDO2NBQ0csSUFESDtXQUVBLElBRkE7cUJBR1UsSUFIVjtXQUlBLElBSkE7Z0JBS0ssS0FMTDt1QkFNWSxJQU5aO2VBT0k7ZUFDQSxDQURBO2dCQUVDLENBRkQ7Z0JBR0MsQ0FIRDtnQkFJQztPQVhMO3VCQWFZLEtBYlo7Z0JBY0ssQ0FkTDtpQkFlTSxLQWZOO2dCQWdCSyxLQWhCTDtxQkFpQlUsQ0FqQlY7b0JBa0JTLEtBbEJUO29CQW1CUyxLQW5CVDt5QkFvQmMsSUFwQmQ7b0JBcUJTLENBckJUO3FCQXNCVSxDQXRCVjtrQkF1Qk8sSUF2QlA7bUJBd0JRLENBeEJSO29CQXlCUyxJQXpCVDtnQkEwQkssS0ExQkw7MkJBMkJnQjtLQTNCdkI7R0FQVzs7WUFxQ0g7ZUFBQSx5QkFDTzthQUNOLEtBQUtDLEtBQUwsR0FBYSxLQUFLakgsT0FBekI7S0FGTTtnQkFBQSwwQkFJUTthQUNQLEtBQUtrSCxNQUFMLEdBQWMsS0FBS2xILE9BQTFCO0tBTE07K0JBQUEseUNBT3VCO2FBQ3RCLEtBQUttSCxtQkFBTCxHQUEyQixLQUFLbkgsT0FBdkM7S0FSTTtlQUFBLHlCQVVPO2FBQ04sS0FBS3VCLFlBQUwsR0FBb0IsS0FBSzZGLGFBQWhDOztHQWhEUztTQUFBLHFCQW1ERjtTQUNKQyxLQUFMO01BQ0VDLFdBQUY7TUFDRUMsY0FBRjtRQUNJQyxXQUFXLEtBQUtDLGdCQUFMLEVBQWY7UUFDSSxDQUFDRCxTQUFTRSxLQUFkLEVBQXFCO2NBQ1hDLElBQVIsQ0FBYSx5REFBYjs7R0F6RFM7O1NBNEROO2lCQUNRLHVCQUFZO1VBQ25CLENBQUMsS0FBS0MsUUFBTCxFQUFMLEVBQXNCO2FBQ2ZQLEtBQUw7T0FERixNQUVPO1lBQ0QsS0FBS1EsaUJBQVQsRUFBNEI7ZUFDckJDLFFBQUwsR0FBZ0IsS0FBaEI7O2FBRUdDLFFBQUw7YUFDS0MsV0FBTDs7S0FUQztrQkFZUyx3QkFBWTtVQUNwQixDQUFDLEtBQUtKLFFBQUwsRUFBTCxFQUFzQjthQUNmUCxLQUFMO09BREYsTUFFTztZQUNELEtBQUtRLGlCQUFULEVBQTRCO2VBQ3JCQyxRQUFMLEdBQWdCLEtBQWhCOzthQUVHQyxRQUFMO2FBQ0tDLFdBQUw7O0tBcEJDO2lCQXVCUSx1QkFBWTtVQUNuQixDQUFDLEtBQUtKLFFBQUwsRUFBTCxFQUFzQjthQUNmUCxLQUFMO09BREYsTUFFTzthQUNBWSxLQUFMOztLQTNCQztpQkE4QlEsdUJBQVk7VUFDbkIsQ0FBQyxLQUFLTCxRQUFMLEVBQUwsRUFBc0I7YUFDZlAsS0FBTDs7S0FoQ0M7c0JBbUNhLDRCQUFZO1VBQ3hCLENBQUMsS0FBS08sUUFBTCxFQUFMLEVBQXNCO2FBQ2ZQLEtBQUw7O0tBckNDO2lDQXdDd0IsdUNBQVk7VUFDbkMsQ0FBQyxLQUFLTyxRQUFMLEVBQUwsRUFBc0I7YUFDZlAsS0FBTDs7S0ExQ0M7cUJBQUEsNkJBNkNjckIsR0E3Q2QsRUE2Q21CO1VBQ2xCQSxHQUFKLEVBQVM7YUFDRjhCLFFBQUwsR0FBZ0IsS0FBaEI7O1dBRUdFLFdBQUw7S0FqREc7Y0FBQSxzQkFtRE9oQyxHQW5EUCxFQW1EWWtDLE1BbkRaLEVBbURvQjtVQUNuQixDQUFDLEtBQUtOLFFBQUwsRUFBTCxFQUFzQjtVQUNsQixDQUFDTyxFQUFFQyxXQUFGLENBQWNwQyxHQUFkLENBQUwsRUFBeUI7VUFDckI3RSxJQUFJLENBQVI7VUFDSWdILEVBQUVDLFdBQUYsQ0FBY0YsTUFBZCxLQUF5QkEsV0FBVyxDQUF4QyxFQUEyQztZQUNyQ2xDLE1BQU1rQyxNQUFWOztVQUVFRyxNQUFNLEtBQUtDLG1CQUFMLElBQTRCO1dBQ2pDLEtBQUtDLE9BQUwsQ0FBYUMsTUFBYixHQUFzQixLQUFLRCxPQUFMLENBQWF0QixLQUFiLEdBQXFCLENBRFY7V0FFakMsS0FBS3NCLE9BQUwsQ0FBYUUsTUFBYixHQUFzQixLQUFLRixPQUFMLENBQWFyQixNQUFiLEdBQXNCO09BRmpEO1dBSUtxQixPQUFMLENBQWF0QixLQUFiLEdBQXFCLEtBQUsxRixZQUFMLEdBQW9CeUUsR0FBekM7V0FDS3VDLE9BQUwsQ0FBYXJCLE1BQWIsR0FBc0IsS0FBS0UsYUFBTCxHQUFxQnBCLEdBQTNDO1VBQ0ksS0FBSzZCLGlCQUFULEVBQTRCO2FBQ3JCYSwyQkFBTDs7VUFFRSxLQUFLQyxZQUFULEVBQXVCO2NBQ2ZDLEdBQVIsQ0FBWSx3QkFBWjtVQUNJQyxVQUFVLENBQUMxSCxJQUFJLENBQUwsS0FBV2tILElBQUlsSCxDQUFKLEdBQVEsS0FBS29ILE9BQUwsQ0FBYUMsTUFBaEMsQ0FBZDtVQUNJTSxVQUFVLENBQUMzSCxJQUFJLENBQUwsS0FBV2tILElBQUlqSCxDQUFKLEdBQVEsS0FBS21ILE9BQUwsQ0FBYUUsTUFBaEMsQ0FBZDtXQUNLRixPQUFMLENBQWFDLE1BQWIsR0FBc0IsS0FBS0QsT0FBTCxDQUFhQyxNQUFiLEdBQXNCSyxPQUE1QztXQUNLTixPQUFMLENBQWFFLE1BQWIsR0FBc0IsS0FBS0YsT0FBTCxDQUFhRSxNQUFiLEdBQXNCSyxPQUE1QztLQXhFRzs7cUJBMEVZLHNCQUFVOUMsR0FBVixFQUFla0MsTUFBZixFQUF1QjtVQUNsQyxDQUFDQyxFQUFFQyxXQUFGLENBQWNwQyxHQUFkLENBQUwsRUFBeUI7V0FDcEIrQyxVQUFMLEdBQWtCL0MsTUFBTSxLQUFLekUsWUFBN0I7VUFDSSxLQUFLcUcsUUFBTCxFQUFKLEVBQXFCO1lBQ2Y1RyxLQUFLZ0ksR0FBTCxDQUFTaEQsTUFBTWtDLE1BQWYsSUFBMEJsQyxPQUFPLElBQUksTUFBWCxDQUE5QixFQUFtRDtlQUM1Q2lELEtBQUwsQ0FBV25DLE9BQU9vQyxVQUFsQjtlQUNLakIsS0FBTDs7O0tBaEZEO3NCQW9GYSx1QkFBVWpDLEdBQVYsRUFBZTtVQUMzQixDQUFDbUMsRUFBRUMsV0FBRixDQUFjcEMsR0FBZCxDQUFMLEVBQXlCO1dBQ3BCK0MsVUFBTCxHQUFrQi9DLE1BQU0sS0FBS29CLGFBQTdCOztHQWxKUztXQXFKSjthQUFBLHVCQUNNO2FBQ0osS0FBS3JILE1BQVo7S0FGSztjQUFBLHdCQUlPO2FBQ0wsS0FBS29KLEdBQVo7S0FMSztpQkFBQSwyQkFPVTthQUNSLEtBQUtDLEtBQUwsQ0FBV0MsU0FBWCxDQUFxQkMsS0FBckIsQ0FBMkIsQ0FBM0IsQ0FBUDtLQVJLO1FBQUEsZ0JBVURsRixNQVZDLEVBVU87VUFDUixDQUFDQSxNQUFMLEVBQWE7VUFDVG1GLE9BQU8sS0FBS2hCLE9BQUwsQ0FBYUMsTUFBeEI7VUFDSWdCLE9BQU8sS0FBS2pCLE9BQUwsQ0FBYUUsTUFBeEI7V0FDS0YsT0FBTCxDQUFhQyxNQUFiLElBQXVCcEUsT0FBT2pELENBQTlCO1dBQ0tvSCxPQUFMLENBQWFFLE1BQWIsSUFBdUJyRSxPQUFPaEQsQ0FBOUI7VUFDSSxLQUFLeUcsaUJBQVQsRUFBNEI7YUFDckI0QiwwQkFBTDs7VUFFRSxLQUFLbEIsT0FBTCxDQUFhQyxNQUFiLEtBQXdCZSxJQUF4QixJQUFnQyxLQUFLaEIsT0FBTCxDQUFhRSxNQUFiLEtBQXdCZSxJQUE1RCxFQUFrRTthQUMzRFAsS0FBTCxDQUFXbkMsT0FBTzRDLFVBQWxCO2FBQ0t6QixLQUFMOztLQXJCRztlQUFBLHlCQXdCa0I7VUFBWjBCLE1BQVksdUVBQUgsQ0FBRzs7V0FDbEJDLElBQUwsQ0FBVSxFQUFFekksR0FBRyxDQUFMLEVBQVFDLEdBQUcsQ0FBQ3VJLE1BQVosRUFBVjtLQXpCSztpQkFBQSwyQkEyQm9CO1VBQVpBLE1BQVksdUVBQUgsQ0FBRzs7V0FDcEJDLElBQUwsQ0FBVSxFQUFFekksR0FBRyxDQUFMLEVBQVFDLEdBQUd1SSxNQUFYLEVBQVY7S0E1Qks7aUJBQUEsMkJBOEJvQjtVQUFaQSxNQUFZLHVFQUFILENBQUc7O1dBQ3BCQyxJQUFMLENBQVUsRUFBRXpJLEdBQUcsQ0FBQ3dJLE1BQU4sRUFBY3ZJLEdBQUcsQ0FBakIsRUFBVjtLQS9CSztrQkFBQSw0QkFpQ3FCO1VBQVp1SSxNQUFZLHVFQUFILENBQUc7O1dBQ3JCQyxJQUFMLENBQVUsRUFBRXpJLEdBQUd3SSxNQUFMLEVBQWF2SSxHQUFHLENBQWhCLEVBQVY7S0FsQ0s7UUFBQSxrQkFvQ2dDO1VBQWpDeUksTUFBaUMsdUVBQXhCLElBQXdCO1VBQWxCQyxZQUFrQix1RUFBSCxDQUFHOztVQUNqQ0MsWUFBWSxLQUFLQyxTQUFMLEdBQWlCRixZQUFqQztVQUNJRyxRQUFTLEtBQUtDLFdBQUwsR0FBbUIzRCxZQUFwQixHQUFvQ3dELFNBQWhEO1VBQ0k1SSxJQUFJLENBQVI7VUFDSTBJLE1BQUosRUFBWTtZQUNOLElBQUlJLEtBQVI7T0FERixNQUVPLElBQUksS0FBSzFCLE9BQUwsQ0FBYXRCLEtBQWIsR0FBcUJQLFNBQXpCLEVBQW9DO1lBQ3JDLElBQUl1RCxLQUFSOztXQUVHbEIsVUFBTCxJQUFtQjVILENBQW5CO0tBN0NLO1VBQUEsb0JBK0NHO1dBQ0hnSixJQUFMLENBQVUsSUFBVjtLQWhESztXQUFBLHFCQWtESTtXQUNKQSxJQUFMLENBQVUsS0FBVjtLQW5ESztVQUFBLG9CQXFEVztVQUFWQyxJQUFVLHVFQUFILENBQUc7O1VBQ1osS0FBS0MsZUFBTCxJQUF3QixLQUFLQyxRQUFqQyxFQUEyQzthQUNwQ0MsU0FBU0gsSUFBVCxDQUFQO1VBQ0k1RSxNQUFNNEUsSUFBTixLQUFlQSxPQUFPLENBQXRCLElBQTJCQSxPQUFPLENBQUMsQ0FBdkMsRUFBMEM7Z0JBQ2hDekMsSUFBUixDQUFhLG1GQUFiO2VBQ08sQ0FBUDs7V0FFRzZDLGFBQUwsQ0FBbUJKLElBQW5CO0tBNURLO2FBQUEsdUJBOERNO1dBQ05LLGFBQUwsQ0FBbUIsQ0FBQyxFQUFwQjtLQS9ESztZQUFBLHNCQWlFSztXQUNMQSxhQUFMLENBQW1CLEVBQW5CO0tBbEVLO2lCQUFBLHlCQW9FUUMsT0FwRVIsRUFvRWlCOzs7VUFDbEIsQ0FBQ0EsT0FBTCxFQUFjOztXQUVUdkIsR0FBTCxDQUFTd0IsU0FBVCxDQUFtQixDQUFuQixFQUFzQixDQUF0QixFQUF5QixLQUFLNUssTUFBTCxDQUFZa0gsS0FBckMsRUFBNEMsS0FBS2xILE1BQUwsQ0FBWW1ILE1BQXhEO1dBQ0tpQyxHQUFMLENBQVN5QixTQUFULENBQW1CLEtBQUs3SyxNQUFMLENBQVlrSCxLQUFaLEdBQW9CLENBQXZDLEVBQTBDLEtBQUtsSCxNQUFMLENBQVltSCxNQUFaLEdBQXFCLENBQS9ELEVBSnNCO1dBS2pCaUMsR0FBTCxDQUFTMEIsTUFBVCxDQUFnQkgsVUFBVTFKLEtBQUs4SixFQUFmLEdBQW9CLEdBQXBDOzs7VUFHSSxDQUFDLEtBQUt6SixHQUFWLEVBQWU7VUFDWEksT0FBT0kscUJBQVgsRUFBa0M7OEJBQ1YsWUFBTTtnQkFDckJrSixnQkFBTDtnQkFDSzVCLEdBQUwsQ0FBU2xFLFNBQVQsQ0FBbUIsTUFBSzVELEdBQXhCLEVBQTZCLENBQUMsTUFBS3RCLE1BQUwsQ0FBWWtILEtBQWIsR0FBcUIsQ0FBbEQsRUFBcUQsQ0FBQyxNQUFLbEgsTUFBTCxDQUFZbUgsTUFBYixHQUFzQixDQUEzRSxFQUE4RSxNQUFLbkgsTUFBTCxDQUFZbUgsTUFBMUYsRUFBa0csTUFBS25ILE1BQUwsQ0FBWWtILEtBQTlHO1NBRkY7T0FERixNQUtPO2FBQ0E4RCxnQkFBTDthQUNLNUIsR0FBTCxDQUFTbEUsU0FBVCxDQUFtQixLQUFLNUQsR0FBeEIsRUFBNkIsQ0FBQyxLQUFLdEIsTUFBTCxDQUFZa0gsS0FBYixHQUFxQixDQUFsRCxFQUFxRCxDQUFDLEtBQUtsSCxNQUFMLENBQVltSCxNQUFiLEdBQXNCLENBQTNFLEVBQThFLEtBQUtuSCxNQUFMLENBQVltSCxNQUExRixFQUFrRyxLQUFLbkgsTUFBTCxDQUFZa0gsS0FBOUc7OztXQUdHa0MsR0FBTCxDQUFTeUIsU0FBVCxDQUFtQixFQUFFLEtBQUs3SyxNQUFMLENBQVlrSCxLQUFaLEdBQW9CLENBQXRCLENBQW5CLEVBQTZDLEVBQUUsS0FBS2xILE1BQUwsQ0FBWW1ILE1BQVosR0FBcUIsQ0FBdkIsQ0FBN0MsRUFuQnNCO1dBb0JqQmUsS0FBTDtXQUNLZ0IsS0FBTCxDQUFXbkMsT0FBT2tFLFlBQWxCO0tBekZLO1NBQUEsbUJBMkZFO1VBQ0gsS0FBS1gsZUFBTCxJQUF3QixLQUFLQyxRQUFqQyxFQUEyQztXQUN0Q1csZUFBTCxDQUFxQixDQUFyQjtLQTdGSztTQUFBLG1CQStGRTtVQUNILEtBQUtaLGVBQUwsSUFBd0IsS0FBS0MsUUFBakMsRUFBMkM7V0FDdENXLGVBQUwsQ0FBcUIsQ0FBckI7S0FqR0s7V0FBQSxxQkFtR0k7V0FDSkMsU0FBTCxDQUFlLEtBQUs3RCxLQUFwQjtLQXBHSztZQUFBLHNCQXNHSzthQUNILENBQUMsQ0FBQyxLQUFLUyxRQUFkO0tBdkdLO2lCQUFBLHlCQXlHUXFELFFBekdSLEVBeUdrQjtVQUNuQixDQUFDQSxRQUFELElBQWEsQ0FBQyxLQUFLdkQsUUFBTCxFQUFsQixFQUFtQztXQUM5QmUsWUFBTCxHQUFvQndDLFFBQXBCO1VBQ0k5RixNQUFNOEYsU0FBU3JHLFdBQVQsSUFBd0IsS0FBS0EsV0FBN0IsSUFBNEMsQ0FBdEQ7V0FDS21HLGVBQUwsQ0FBcUI1RixHQUFyQixFQUEwQixJQUExQjtLQTdHSzttQkFBQSwyQkErR1VsQyxJQS9HVixFQStHZ0JpSSxlQS9HaEIsRUErR2lDO1VBQ2xDLENBQUMsS0FBS3hELFFBQUwsRUFBTCxFQUFzQixPQUFPLEVBQVA7YUFDZixLQUFLN0gsTUFBTCxDQUFZc0QsU0FBWixDQUFzQkYsSUFBdEIsRUFBNEJpSSxlQUE1QixDQUFQO0tBakhLO2dCQUFBLHdCQW1IT3JKLFFBbkhQLEVBbUhpQnNKLFFBbkhqQixFQW1IMkJDLGVBbkgzQixFQW1INEM7VUFDN0MsQ0FBQyxLQUFLMUQsUUFBTCxFQUFMLEVBQXNCLE9BQU8sSUFBUDtXQUNqQjdILE1BQUwsQ0FBWWtELE1BQVosQ0FBbUJsQixRQUFuQixFQUE2QnNKLFFBQTdCLEVBQXVDQyxlQUF2QztLQXJISztnQkFBQSwwQkF1SGdCOzs7d0NBQU5DLElBQU07WUFBQTs7O1VBQ2pCLE9BQU9DLE9BQVAsSUFBa0IsV0FBdEIsRUFBbUM7Z0JBQ3pCN0QsSUFBUixDQUFhLGlGQUFiOzs7YUFHSyxJQUFJNkQsT0FBSixDQUFZLFVBQUNDLE9BQUQsRUFBVUMsTUFBVixFQUFxQjtZQUNsQztpQkFDR0MsWUFBTCxDQUFrQixVQUFDQyxJQUFELEVBQVU7b0JBQ2xCQSxJQUFSO1dBREYsRUFFR0wsSUFGSDtTQURGLENBSUUsT0FBT00sR0FBUCxFQUFZO2lCQUNMQSxHQUFQOztPQU5HLENBQVA7S0E1SEs7ZUFBQSx5QkFzSVE7VUFDVCxDQUFDLEtBQUtqRSxRQUFMLEVBQUwsRUFBc0IsT0FBTyxFQUFQO3FCQUNHLEtBQUtXLE9BRmpCO1VBRVBDLE1BRk8sWUFFUEEsTUFGTztVQUVDQyxNQUZELFlBRUNBLE1BRkQ7O2FBR047c0JBQUE7c0JBQUE7ZUFHRSxLQUFLTSxVQUhQO3FCQUlRLEtBQUtqRTtPQUpwQjtLQXpJSztvQkFBQSw4QkFnSmE7VUFDZGdILE1BQU10SyxTQUFTdUssYUFBVCxDQUF1QixLQUF2QixDQUFWO2FBQ087aUJBQ0l0SyxPQUFPSSxxQkFBUCxJQUFnQ0osT0FBT3VLLElBQXZDLElBQStDdkssT0FBT3dLLFVBQXRELElBQW9FeEssT0FBT3lLLFFBQTNFLElBQXVGekssT0FBT2lDLElBRGxHO2VBRUUsaUJBQWlCb0ksR0FBakIsSUFBd0IsWUFBWUE7T0FGN0M7S0FsSks7Y0FBQSx3QkF1Sk87V0FDUDFDLEtBQUwsQ0FBV0MsU0FBWCxDQUFxQjhDLEtBQXJCO0tBeEpLO1VBQUEsb0JBMEpHO1VBQ0poRCxNQUFNLEtBQUtBLEdBQWY7V0FDSzRCLGdCQUFMO1dBQ0txQixvQkFBTDtVQUNJQyxZQUFKLEdBQW1CLFFBQW5CO1VBQ0lDLFNBQUosR0FBZ0IsUUFBaEI7VUFDSUMsa0JBQWtCLEtBQUtyQyxXQUFMLEdBQW1CdkQsMEJBQW5CLEdBQWdELEtBQUs2RixXQUFMLENBQWlCNUssTUFBdkY7VUFDSTZLLFdBQVksQ0FBQyxLQUFLQywyQkFBTixJQUFxQyxLQUFLQSwyQkFBTCxJQUFvQyxDQUExRSxHQUErRUgsZUFBL0UsR0FBaUcsS0FBS0csMkJBQXJIO1VBQ0lDLElBQUosR0FBV0YsV0FBVyxlQUF0QjtVQUNJRyxTQUFKLEdBQWlCLENBQUMsS0FBS0MsZ0JBQU4sSUFBMEIsS0FBS0EsZ0JBQUwsSUFBeUIsU0FBcEQsR0FBaUUsU0FBakUsR0FBNkUsS0FBS0EsZ0JBQWxHO1VBQ0lDLFFBQUosQ0FBYSxLQUFLTixXQUFsQixFQUErQixLQUFLdEMsV0FBTCxHQUFtQixDQUFsRCxFQUFxRCxLQUFLNkMsWUFBTCxHQUFvQixDQUF6RTtVQUNJQyxXQUFXLEtBQUszTCxHQUFMLElBQVksSUFBM0I7V0FDSzRMLGFBQUwsR0FBcUIsSUFBckI7V0FDSzVMLEdBQUwsR0FBVyxJQUFYO1dBQ0srSCxLQUFMLENBQVdDLFNBQVgsQ0FBcUIxRCxLQUFyQixHQUE2QixFQUE3QjtXQUNLNEMsT0FBTCxHQUFlO2VBQ04sQ0FETTtnQkFFTCxDQUZLO2dCQUdMLENBSEs7Z0JBSUw7T0FKVjtXQU1LekQsV0FBTCxHQUFtQixDQUFuQjtXQUNLaUUsVUFBTCxHQUFrQixJQUFsQjtXQUNLSixZQUFMLEdBQW9CLElBQXBCO1dBQ0tiLFFBQUwsR0FBZ0IsS0FBaEI7VUFDSWtGLFFBQUosRUFBYzthQUNQL0QsS0FBTCxDQUFXbkMsT0FBT29HLGtCQUFsQjs7S0FwTEc7U0FBQSxtQkF1TEU7V0FDRm5OLE1BQUwsR0FBYyxLQUFLcUosS0FBTCxDQUFXckosTUFBekI7V0FDS2dJLFFBQUw7V0FDS2hJLE1BQUwsQ0FBWW9OLEtBQVosQ0FBa0JDLGVBQWxCLEdBQXFDLENBQUMsS0FBS0MsV0FBTixJQUFxQixLQUFLQSxXQUFMLElBQW9CLFNBQTFDLEdBQXVELGFBQXZELEdBQXdFLE9BQU8sS0FBS0EsV0FBWixLQUE0QixRQUE1QixHQUF1QyxLQUFLQSxXQUE1QyxHQUEwRCxFQUF0SztXQUNLbEUsR0FBTCxHQUFXLEtBQUtwSixNQUFMLENBQVl1TixVQUFaLENBQXVCLElBQXZCLENBQVg7V0FDS0wsYUFBTCxHQUFxQixJQUFyQjtXQUNLNUwsR0FBTCxHQUFXLElBQVg7V0FDS3lHLFFBQUwsR0FBZ0IsS0FBaEI7V0FDS3lGLFdBQUw7V0FDS3RFLEtBQUwsQ0FBV25DLE9BQU9DLFVBQWxCLEVBQThCLElBQTlCO0tBaE1LO1lBQUEsc0JBa01LO1dBQ0xoSCxNQUFMLENBQVlrSCxLQUFaLEdBQW9CLEtBQUtpRCxXQUF6QjtXQUNLbkssTUFBTCxDQUFZbUgsTUFBWixHQUFxQixLQUFLNkYsWUFBMUI7V0FDS2hOLE1BQUwsQ0FBWW9OLEtBQVosQ0FBa0JsRyxLQUFsQixHQUEwQixLQUFLQSxLQUFMLEdBQWEsSUFBdkM7V0FDS2xILE1BQUwsQ0FBWW9OLEtBQVosQ0FBa0JqRyxNQUFsQixHQUEyQixLQUFLQSxNQUFMLEdBQWMsSUFBekM7S0F0TUs7aUJBQUEseUJBd01Ra0QsSUF4TVIsRUF3TWM7VUFDZnRGLGNBQWMsQ0FBbEI7Y0FDUXNGLElBQVI7YUFDTyxDQUFMO3dCQUNnQixDQUFkOzthQUVHLENBQUw7d0JBQ2dCLENBQWQ7O2FBRUcsQ0FBTDt3QkFDZ0IsQ0FBZDs7YUFFRyxDQUFDLENBQU47d0JBQ2dCLENBQWQ7O2FBRUcsQ0FBQyxDQUFOO3dCQUNnQixDQUFkOzthQUVHLENBQUMsQ0FBTjt3QkFDZ0IsQ0FBZDs7O1dBR0NhLGVBQUwsQ0FBcUJuRyxXQUFyQjtLQTlOSzt3QkFBQSxrQ0FnT2lCOzs7VUFDbEJ6RCxZQUFKO1VBQ0ksS0FBS21NLE1BQUwsQ0FBWWhCLFdBQVosSUFBMkIsS0FBS2dCLE1BQUwsQ0FBWWhCLFdBQVosQ0FBd0IsQ0FBeEIsQ0FBL0IsRUFBMkQ7WUFDckRpQixRQUFRLEtBQUtELE1BQUwsQ0FBWWhCLFdBQVosQ0FBd0IsQ0FBeEIsQ0FBWjtZQUNNa0IsR0FGbUQsR0FFdENELEtBRnNDLENBRW5EQyxHQUZtRDtZQUU5Q0MsR0FGOEMsR0FFdENGLEtBRnNDLENBRTlDRSxHQUY4Qzs7WUFHckRELE9BQU8sS0FBUCxJQUFnQkMsR0FBcEIsRUFBeUI7Z0JBQ2pCQSxHQUFOOzs7VUFHQSxDQUFDdE0sR0FBTCxFQUFVO1VBQ051TSxTQUFTLFNBQVRBLE1BQVMsR0FBTTtlQUNaekUsR0FBTCxDQUFTbEUsU0FBVCxDQUFtQjVELEdBQW5CLEVBQXdCLENBQXhCLEVBQTJCLENBQTNCLEVBQThCLE9BQUs2SSxXQUFuQyxFQUFnRCxPQUFLNkMsWUFBckQ7T0FERjtVQUdJNUUsRUFBRTBGLFdBQUYsQ0FBY3hNLEdBQWQsQ0FBSixFQUF3Qjs7T0FBeEIsTUFFTztZQUNEeU0sTUFBSixHQUFhRixNQUFiOztLQWhQRztlQUFBLHlCQW1QUTs7O1VBQ1R4SSxZQUFKO1VBQVMvRCxZQUFUO1VBQ0ksS0FBS21NLE1BQUwsQ0FBWU8sT0FBWixJQUF1QixLQUFLUCxNQUFMLENBQVlPLE9BQVosQ0FBb0IsQ0FBcEIsQ0FBM0IsRUFBbUQ7WUFDN0NOLFFBQVEsS0FBS0QsTUFBTCxDQUFZTyxPQUFaLENBQW9CLENBQXBCLENBQVo7WUFDTUwsR0FGMkMsR0FFOUJELEtBRjhCLENBRTNDQyxHQUYyQztZQUV0Q0MsR0FGc0MsR0FFOUJGLEtBRjhCLENBRXRDRSxHQUZzQzs7WUFHN0NELE9BQU8sS0FBUCxJQUFnQkMsR0FBcEIsRUFBeUI7Z0JBQ2pCQSxHQUFOOzs7VUFHQSxLQUFLSyxZQUFMLElBQXFCLE9BQU8sS0FBS0EsWUFBWixLQUE2QixRQUF0RCxFQUFnRTtjQUN4RCxLQUFLQSxZQUFYO2NBQ00sSUFBSTdJLEtBQUosRUFBTjtZQUNJLENBQUMsU0FBU21CLElBQVQsQ0FBY2xCLEdBQWQsQ0FBRCxJQUF1QixDQUFDLFNBQVNrQixJQUFULENBQWNsQixHQUFkLENBQTVCLEVBQWdEO2NBQzFDNkksWUFBSixDQUFpQixhQUFqQixFQUFnQyxXQUFoQzs7WUFFRTdJLEdBQUosR0FBVUEsR0FBVjtPQU5GLE1BT08sSUFBSThJLFFBQU8sS0FBS0YsWUFBWixNQUE2QixRQUE3QixJQUF5QyxLQUFLQSxZQUFMLFlBQTZCN0ksS0FBMUUsRUFBaUY7Y0FDaEYsS0FBSzZJLFlBQVg7O1VBRUUsQ0FBQzVJLEdBQUQsSUFBUSxDQUFDL0QsR0FBYixFQUFrQjthQUNYOE0sTUFBTDs7O1VBR0VoRyxFQUFFMEYsV0FBRixDQUFjeE0sR0FBZCxDQUFKLEVBQXdCO2FBQ2pCNEgsS0FBTCxDQUFXbkMsT0FBT3NILDBCQUFsQjthQUNLQyxPQUFMLENBQWFoTixHQUFiLEVBQWtCLENBQUNBLElBQUlpTixPQUFKLENBQVksaUJBQVosQ0FBbkI7T0FGRixNQUdPO1lBQ0RSLE1BQUosR0FBYSxZQUFNO2lCQUNaN0UsS0FBTCxDQUFXbkMsT0FBT3NILDBCQUFsQjtpQkFDS0MsT0FBTCxDQUFhaE4sR0FBYixFQUFrQixDQUFDQSxJQUFJaU4sT0FBSixDQUFZLGlCQUFaLENBQW5CO1NBRkY7WUFJSUMsT0FBSixHQUFjLFlBQU07aUJBQ2JKLE1BQUw7U0FERjs7S0FsUkc7V0FBQSxtQkF1UkU5TSxHQXZSRixFQXVSd0I7VUFBakJ5RCxXQUFpQix1RUFBSCxDQUFHOztXQUN4Qm1JLGFBQUwsR0FBcUI1TCxHQUFyQjtXQUNLQSxHQUFMLEdBQVdBLEdBQVg7VUFDSW1FLE1BQU1WLFdBQU4sQ0FBSixFQUF3QjtzQkFDUixDQUFkOztXQUVHbUcsZUFBTCxDQUFxQm5HLFdBQXJCO0tBN1JLO2dCQUFBLDBCQStSUztVQUNWLENBQUMsS0FBSzhDLFFBQUwsRUFBRCxJQUFvQixDQUFDLEtBQUs0RyxvQkFBMUIsSUFBa0QsQ0FBQyxLQUFLbEUsUUFBeEQsSUFBb0UsQ0FBQyxLQUFLbUUsWUFBOUUsRUFBNEY7YUFDckZDLFVBQUw7O0tBalNHO3NCQUFBLGdDQW9TZTtVQUNoQkMsUUFBUSxLQUFLdkYsS0FBTCxDQUFXQyxTQUF2QjtVQUNJLENBQUNzRixNQUFNckYsS0FBTixDQUFZMUgsTUFBakIsRUFBeUI7VUFDckJnTixPQUFPRCxNQUFNckYsS0FBTixDQUFZLENBQVosQ0FBWDtXQUNLdUYsWUFBTCxDQUFrQkQsSUFBbEI7S0F4U0s7Z0JBQUEsd0JBMFNPQSxJQTFTUCxFQTBTYTs7O1dBQ2IzRixLQUFMLENBQVduQyxPQUFPZ0ksaUJBQWxCLEVBQXFDRixJQUFyQztVQUNJLENBQUMsS0FBS0csZ0JBQUwsQ0FBc0JILElBQXRCLENBQUwsRUFBa0M7YUFDM0IzRixLQUFMLENBQVduQyxPQUFPa0ksc0JBQWxCLEVBQTBDSixJQUExQztjQUNNLElBQUlLLEtBQUosQ0FBVSxzQ0FBc0MsS0FBS0MsYUFBM0MsR0FBMkQsU0FBckUsQ0FBTjs7VUFFRSxDQUFDLEtBQUtDLGdCQUFMLENBQXNCUCxJQUF0QixDQUFMLEVBQWtDO2FBQzNCM0YsS0FBTCxDQUFXbkMsT0FBT3NJLHdCQUFsQixFQUE0Q1IsSUFBNUM7WUFDSXpMLE9BQU95TCxLQUFLekwsSUFBTCxJQUFheUwsS0FBS1MsSUFBTCxDQUFVQyxXQUFWLEdBQXdCaE0sS0FBeEIsQ0FBOEIsR0FBOUIsRUFBbUNpTSxHQUFuQyxFQUF4QjtjQUNNLElBQUlOLEtBQUosaUJBQXdCOUwsSUFBeEIsNkNBQW9FLEtBQUtxTSxNQUF6RSxRQUFOOztVQUVFLE9BQU8vTixPQUFPd0ssVUFBZCxLQUE2QixXQUFqQyxFQUE4QztZQUN4Q3dELEtBQUssSUFBSXhELFVBQUosRUFBVDtXQUNHNkIsTUFBSCxHQUFZLFVBQUM0QixDQUFELEVBQU87Y0FDYkMsV0FBV0QsRUFBRUUsTUFBRixDQUFTQyxNQUF4QjtjQUNJL0ssY0FBYyxDQUFsQjtjQUNJOzBCQUNZcUQsRUFBRTJILGtCQUFGLENBQXFCM0gsRUFBRTRILG1CQUFGLENBQXNCSixRQUF0QixDQUFyQixDQUFkO1dBREYsQ0FFRSxPQUFPOUQsR0FBUCxFQUFZO2NBQ1YvRyxjQUFjLENBQWxCLEVBQXFCQSxjQUFjLENBQWQ7Y0FDakJ6RCxNQUFNLElBQUk4RCxLQUFKLEVBQVY7Y0FDSUMsR0FBSixHQUFVdUssUUFBVjtjQUNJN0IsTUFBSixHQUFhLFlBQU07bUJBQ1pPLE9BQUwsQ0FBYWhOLEdBQWIsRUFBa0J5RCxXQUFsQjttQkFDS21FLEtBQUwsQ0FBV25DLE9BQU9rSixTQUFsQjtXQUZGO1NBVEY7V0FjR0MsYUFBSCxDQUFpQnJCLElBQWpCOztLQXJVRztvQkFBQSw0QkF3VVdBLElBeFVYLEVBd1VpQjtVQUNsQixDQUFDQSxJQUFMLEVBQVcsT0FBTyxLQUFQO1VBQ1AsQ0FBQyxLQUFLTSxhQUFOLElBQXVCLEtBQUtBLGFBQUwsSUFBc0IsQ0FBakQsRUFBb0QsT0FBTyxJQUFQO2FBQzdDTixLQUFLc0IsSUFBTCxHQUFZLEtBQUtoQixhQUF4QjtLQTNVSztvQkFBQSw0QkE2VVdOLElBN1VYLEVBNlVpQjtVQUNsQixDQUFDLEtBQUt1QixPQUFWLEVBQW1CLE9BQU8sSUFBUDtVQUNmWCxTQUFTLEtBQUtBLE1BQWxCO1VBQ0lZLGVBQWVaLE9BQU85SyxPQUFQLENBQWUsT0FBZixFQUF3QixFQUF4QixDQUFuQjtVQUNJWixRQUFRMEwsT0FBT2xNLEtBQVAsQ0FBYSxHQUFiLENBQVo7V0FDSyxJQUFJRSxJQUFJLENBQVIsRUFBV1QsTUFBTWUsTUFBTWxDLE1BQTVCLEVBQW9DNEIsSUFBSVQsR0FBeEMsRUFBNkNTLEdBQTdDLEVBQWtEO1lBQzVDTCxPQUFPVyxNQUFNTixDQUFOLENBQVg7WUFDSTZNLElBQUlsTixLQUFLbU4sSUFBTCxFQUFSO1lBQ0lELEVBQUVFLE1BQUYsQ0FBUyxDQUFULEtBQWUsR0FBbkIsRUFBd0I7Y0FDbEIzQixLQUFLUyxJQUFMLENBQVVDLFdBQVYsR0FBd0JoTSxLQUF4QixDQUE4QixHQUE5QixFQUFtQ2lNLEdBQW5DLE9BQTZDYyxFQUFFZixXQUFGLEdBQWdCa0IsS0FBaEIsQ0FBc0IsQ0FBdEIsQ0FBakQsRUFBMkUsT0FBTyxJQUFQO1NBRDdFLE1BRU8sSUFBSSxRQUFRbEssSUFBUixDQUFhK0osQ0FBYixDQUFKLEVBQXFCO2NBQ3RCSSxlQUFlN0IsS0FBS3pMLElBQUwsQ0FBVXVCLE9BQVYsQ0FBa0IsT0FBbEIsRUFBMkIsRUFBM0IsQ0FBbkI7Y0FDSStMLGlCQUFpQkwsWUFBckIsRUFBbUM7bUJBQzFCLElBQVA7O1NBSEcsTUFLQSxJQUFJeEIsS0FBS3pMLElBQUwsS0FBY0EsSUFBbEIsRUFBd0I7aUJBQ3RCLElBQVA7OzthQUdHLEtBQVA7S0FoV0s7ZUFBQSx1QkFrV011TixhQWxXTixFQWtXcUI7VUFDdEIsQ0FBQyxLQUFLclAsR0FBVixFQUFlO1VBQ1hrSCxVQUFVLEtBQUtBLE9BQW5CO1dBQ0toSCxZQUFMLEdBQW9CLEtBQUtGLEdBQUwsQ0FBU0UsWUFBN0I7V0FDSzZGLGFBQUwsR0FBcUIsS0FBSy9GLEdBQUwsQ0FBUytGLGFBQTlCO2NBQ1FvQixNQUFSLEdBQWlCTCxFQUFFQyxXQUFGLENBQWNHLFFBQVFDLE1BQXRCLElBQWdDRCxRQUFRQyxNQUF4QyxHQUFpRCxDQUFsRTtjQUNRQyxNQUFSLEdBQWlCTixFQUFFQyxXQUFGLENBQWNHLFFBQVFFLE1BQXRCLElBQWdDRixRQUFRRSxNQUF4QyxHQUFpRCxDQUFsRTtVQUNJLEtBQUtaLGlCQUFULEVBQTRCO2FBQ3JCOEksV0FBTDtPQURGLE1BRU8sSUFBSSxDQUFDLEtBQUs3SSxRQUFWLEVBQW9CO1lBQ3JCLEtBQUs4SSxXQUFMLElBQW9CLFNBQXhCLEVBQW1DO2VBQzVCQyxVQUFMO1NBREYsTUFFTyxJQUFJLEtBQUtELFdBQUwsSUFBb0IsU0FBeEIsRUFBbUM7ZUFDbkNFLFlBQUw7U0FESyxNQUVBO2VBQ0FILFdBQUw7O09BTkcsTUFRQTthQUNBcEksT0FBTCxDQUFhdEIsS0FBYixHQUFxQixLQUFLMUYsWUFBTCxHQUFvQixLQUFLd0gsVUFBOUM7YUFDS1IsT0FBTCxDQUFhckIsTUFBYixHQUFzQixLQUFLRSxhQUFMLEdBQXFCLEtBQUsyQixVQUFoRDs7VUFFRSxDQUFDLEtBQUtqQixRQUFWLEVBQW9CO1lBQ2QsTUFBTXhCLElBQU4sQ0FBVyxLQUFLeUssZUFBaEIsQ0FBSixFQUFzQztrQkFDNUJ0SSxNQUFSLEdBQWlCLENBQWpCO1NBREYsTUFFTyxJQUFJLFNBQVNuQyxJQUFULENBQWMsS0FBS3lLLGVBQW5CLENBQUosRUFBeUM7a0JBQ3RDdEksTUFBUixHQUFpQixLQUFLc0UsWUFBTCxHQUFvQnhFLFFBQVFyQixNQUE3Qzs7WUFFRSxPQUFPWixJQUFQLENBQVksS0FBS3lLLGVBQWpCLENBQUosRUFBdUM7a0JBQzdCdkksTUFBUixHQUFpQixDQUFqQjtTQURGLE1BRU8sSUFBSSxRQUFRbEMsSUFBUixDQUFhLEtBQUt5SyxlQUFsQixDQUFKLEVBQXdDO2tCQUNyQ3ZJLE1BQVIsR0FBaUIsS0FBSzBCLFdBQUwsR0FBbUIzQixRQUFRdEIsS0FBNUM7O1lBRUUsa0JBQWtCWCxJQUFsQixDQUF1QixLQUFLeUssZUFBNUIsQ0FBSixFQUFrRDtjQUM1Q2xCLFNBQVMsc0JBQXNCbUIsSUFBdEIsQ0FBMkIsS0FBS0QsZUFBaEMsQ0FBYjtjQUNJNVAsSUFBSSxDQUFDME8sT0FBTyxDQUFQLENBQUQsR0FBYSxHQUFyQjtjQUNJek8sSUFBSSxDQUFDeU8sT0FBTyxDQUFQLENBQUQsR0FBYSxHQUFyQjtrQkFDUXJILE1BQVIsR0FBaUJySCxLQUFLLEtBQUsrSSxXQUFMLEdBQW1CM0IsUUFBUXRCLEtBQWhDLENBQWpCO2tCQUNRd0IsTUFBUixHQUFpQnJILEtBQUssS0FBSzJMLFlBQUwsR0FBb0J4RSxRQUFRckIsTUFBakMsQ0FBakI7Ozt1QkFHYSxLQUFLK0osY0FBTCxFQUFqQjtVQUNJUCxpQkFBaUIsS0FBSzdJLGlCQUExQixFQUE2QzthQUN0Q3NDLElBQUwsQ0FBVSxLQUFWLEVBQWlCLENBQWpCO09BREYsTUFFTzthQUNBUCxJQUFMLENBQVUsRUFBRXpJLEdBQUcsQ0FBTCxFQUFRQyxHQUFHLENBQVgsRUFBVjthQUNLNkcsS0FBTDs7S0EvWUc7ZUFBQSx5QkFrWlE7VUFDVGlKLFdBQVcsS0FBSzNQLFlBQXBCO1VBQ0k0UCxZQUFZLEtBQUsvSixhQUFyQjtVQUNJZ0ssY0FBYyxLQUFLbEgsV0FBTCxHQUFtQixLQUFLNkMsWUFBMUM7VUFDSWhFLG1CQUFKO1VBQ0ksS0FBS3NJLFdBQUwsR0FBbUJELFdBQXZCLEVBQW9DO3FCQUNyQkQsWUFBWSxLQUFLcEUsWUFBOUI7YUFDS3hFLE9BQUwsQ0FBYXRCLEtBQWIsR0FBcUJpSyxXQUFXbkksVUFBaEM7YUFDS1IsT0FBTCxDQUFhckIsTUFBYixHQUFzQixLQUFLNkYsWUFBM0I7YUFDS3hFLE9BQUwsQ0FBYUMsTUFBYixHQUFzQixFQUFFLEtBQUtELE9BQUwsQ0FBYXRCLEtBQWIsR0FBcUIsS0FBS2lELFdBQTVCLElBQTJDLENBQWpFO2FBQ0szQixPQUFMLENBQWFFLE1BQWIsR0FBc0IsQ0FBdEI7T0FMRixNQU1PO3FCQUNReUksV0FBVyxLQUFLaEgsV0FBN0I7YUFDSzNCLE9BQUwsQ0FBYXJCLE1BQWIsR0FBc0JpSyxZQUFZcEksVUFBbEM7YUFDS1IsT0FBTCxDQUFhdEIsS0FBYixHQUFxQixLQUFLaUQsV0FBMUI7YUFDSzNCLE9BQUwsQ0FBYUUsTUFBYixHQUFzQixFQUFFLEtBQUtGLE9BQUwsQ0FBYXJCLE1BQWIsR0FBc0IsS0FBSzZGLFlBQTdCLElBQTZDLENBQW5FO2FBQ0t4RSxPQUFMLENBQWFDLE1BQWIsR0FBc0IsQ0FBdEI7O0tBbGFHO2NBQUEsd0JBcWFPO1VBQ1IwSSxXQUFXLEtBQUszUCxZQUFwQjtVQUNJNFAsWUFBWSxLQUFLL0osYUFBckI7VUFDSWdLLGNBQWMsS0FBS2xILFdBQUwsR0FBbUIsS0FBSzZDLFlBQTFDO1VBQ0loRSxtQkFBSjtVQUNJLEtBQUtzSSxXQUFMLEdBQW1CRCxXQUF2QixFQUFvQztxQkFDckJGLFdBQVcsS0FBS2hILFdBQTdCO2FBQ0szQixPQUFMLENBQWFyQixNQUFiLEdBQXNCaUssWUFBWXBJLFVBQWxDO2FBQ0tSLE9BQUwsQ0FBYXRCLEtBQWIsR0FBcUIsS0FBS2lELFdBQTFCO2FBQ0szQixPQUFMLENBQWFFLE1BQWIsR0FBc0IsRUFBRSxLQUFLRixPQUFMLENBQWFyQixNQUFiLEdBQXNCLEtBQUs2RixZQUE3QixJQUE2QyxDQUFuRTtPQUpGLE1BS087cUJBQ1FvRSxZQUFZLEtBQUtwRSxZQUE5QjthQUNLeEUsT0FBTCxDQUFhdEIsS0FBYixHQUFxQmlLLFdBQVduSSxVQUFoQzthQUNLUixPQUFMLENBQWFyQixNQUFiLEdBQXNCLEtBQUs2RixZQUEzQjthQUNLeEUsT0FBTCxDQUFhQyxNQUFiLEdBQXNCLEVBQUUsS0FBS0QsT0FBTCxDQUFhdEIsS0FBYixHQUFxQixLQUFLaUQsV0FBNUIsSUFBMkMsQ0FBakU7O0tBbmJHO2dCQUFBLDBCQXNiUztVQUNWZ0gsV0FBVyxLQUFLM1AsWUFBcEI7VUFDSTRQLFlBQVksS0FBSy9KLGFBQXJCO1dBQ0ttQixPQUFMLENBQWF0QixLQUFiLEdBQXFCaUssUUFBckI7V0FDSzNJLE9BQUwsQ0FBYXJCLE1BQWIsR0FBc0JpSyxTQUF0QjtXQUNLNUksT0FBTCxDQUFhQyxNQUFiLEdBQXNCLEVBQUUsS0FBS0QsT0FBTCxDQUFhdEIsS0FBYixHQUFxQixLQUFLaUQsV0FBNUIsSUFBMkMsQ0FBakU7V0FDSzNCLE9BQUwsQ0FBYUUsTUFBYixHQUFzQixFQUFFLEtBQUtGLE9BQUwsQ0FBYXJCLE1BQWIsR0FBc0IsS0FBSzZGLFlBQTdCLElBQTZDLENBQW5FO0tBNWJLO3VCQUFBLCtCQThiY3hNLEdBOWJkLEVBOGJtQjtXQUNuQmtPLFlBQUwsR0FBb0IsSUFBcEI7V0FDSzZDLFlBQUwsR0FBb0IsS0FBcEI7VUFDSUMsZUFBZXBKLEVBQUVxSixnQkFBRixDQUFtQmpSLEdBQW5CLEVBQXdCLElBQXhCLENBQW5CO1dBQ0trUixpQkFBTCxHQUF5QkYsWUFBekI7VUFDSSxLQUFLakgsUUFBVCxFQUFtQjs7VUFFZixDQUFDLEtBQUsxQyxRQUFMLEVBQUQsSUFBb0IsQ0FBQyxLQUFLNEcsb0JBQTlCLEVBQW9EO2FBQzdDa0QsUUFBTCxHQUFnQixJQUFJelAsSUFBSixHQUFXMFAsT0FBWCxFQUFoQjs7OztVQUlFcFIsSUFBSXFSLEtBQUosSUFBYXJSLElBQUlxUixLQUFKLEdBQVksQ0FBN0IsRUFBZ0M7VUFDNUIsQ0FBQ3JSLElBQUlFLE9BQUwsSUFBZ0JGLElBQUlFLE9BQUosQ0FBWW1CLE1BQVosS0FBdUIsQ0FBM0MsRUFBOEM7YUFDdkNpUSxRQUFMLEdBQWdCLElBQWhCO2FBQ0tDLFFBQUwsR0FBZ0IsS0FBaEI7WUFDSUMsUUFBUTVKLEVBQUVxSixnQkFBRixDQUFtQmpSLEdBQW5CLEVBQXdCLElBQXhCLENBQVo7YUFDS3lSLGVBQUwsR0FBdUJELEtBQXZCOztVQUVFeFIsSUFBSUUsT0FBSixJQUFlRixJQUFJRSxPQUFKLENBQVltQixNQUFaLEtBQXVCLENBQXRDLElBQTJDLENBQUMsS0FBS3FRLGtCQUFyRCxFQUF5RTthQUNsRUosUUFBTCxHQUFnQixLQUFoQjthQUNLQyxRQUFMLEdBQWdCLElBQWhCO2FBQ0tJLGFBQUwsR0FBcUIvSixFQUFFZ0ssZ0JBQUYsQ0FBbUI1UixHQUFuQixFQUF3QixJQUF4QixDQUFyQjs7VUFFRTZSLGVBQWUsQ0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixhQUF4QixFQUF1QyxZQUF2QyxFQUFxRCxlQUFyRCxDQUFuQjtXQUNLLElBQUk1TyxJQUFJLENBQVIsRUFBV1QsTUFBTXFQLGFBQWF4USxNQUFuQyxFQUEyQzRCLElBQUlULEdBQS9DLEVBQW9EUyxHQUFwRCxFQUF5RDtZQUNuRGtNLElBQUkwQyxhQUFhNU8sQ0FBYixDQUFSO2lCQUNTNk8sZ0JBQVQsQ0FBMEIzQyxDQUExQixFQUE2QixLQUFLNEMsaUJBQWxDOztLQXpkRztxQkFBQSw2QkE0ZFkvUixHQTVkWixFQTRkaUI7VUFDbEJnUyxzQkFBc0IsQ0FBMUI7VUFDSSxLQUFLZCxpQkFBVCxFQUE0QjtZQUN0QkYsZUFBZXBKLEVBQUVxSixnQkFBRixDQUFtQmpSLEdBQW5CLEVBQXdCLElBQXhCLENBQW5COzhCQUNzQlMsS0FBS0MsSUFBTCxDQUFVRCxLQUFLRSxHQUFMLENBQVNxUSxhQUFhcFEsQ0FBYixHQUFpQixLQUFLc1EsaUJBQUwsQ0FBdUJ0USxDQUFqRCxFQUFvRCxDQUFwRCxJQUF5REgsS0FBS0UsR0FBTCxDQUFTcVEsYUFBYW5RLENBQWIsR0FBaUIsS0FBS3FRLGlCQUFMLENBQXVCclEsQ0FBakQsRUFBb0QsQ0FBcEQsQ0FBbkUsS0FBOEgsQ0FBcEo7O1VBRUUsS0FBS2tKLFFBQVQsRUFBbUI7VUFDZixDQUFDLEtBQUsxQyxRQUFMLEVBQUQsSUFBb0IsQ0FBQyxLQUFLNEcsb0JBQTlCLEVBQW9EO1lBQzlDZ0UsU0FBUyxJQUFJdlEsSUFBSixHQUFXMFAsT0FBWCxFQUFiO1lBQ0tZLHNCQUFzQjlMLG9CQUF2QixJQUFnRCtMLFNBQVMsS0FBS2QsUUFBZCxHQUF5QmxMLGdCQUF6RSxJQUE2RixLQUFLaUksWUFBdEcsRUFBb0g7ZUFDN0dDLFVBQUw7O2FBRUdnRCxRQUFMLEdBQWdCLENBQWhCOzs7V0FHR0csUUFBTCxHQUFnQixLQUFoQjtXQUNLQyxRQUFMLEdBQWdCLEtBQWhCO1dBQ0tJLGFBQUwsR0FBcUIsQ0FBckI7V0FDS0YsZUFBTCxHQUF1QixJQUF2QjtXQUNLVixZQUFMLEdBQW9CLEtBQXBCO1dBQ0tHLGlCQUFMLEdBQXlCLElBQXpCO0tBaGZLO3NCQUFBLDhCQWtmYWxSLEdBbGZiLEVBa2ZrQjtXQUNsQitRLFlBQUwsR0FBb0IsSUFBcEI7VUFDSSxDQUFDLEtBQUsxSixRQUFMLEVBQUwsRUFBc0I7VUFDbEJtSyxRQUFRNUosRUFBRXFKLGdCQUFGLENBQW1CalIsR0FBbkIsRUFBd0IsSUFBeEIsQ0FBWjtXQUNLK0gsbUJBQUwsR0FBMkJ5SixLQUEzQjtVQUNJLEtBQUt6SCxRQUFMLElBQWlCLEtBQUttSSxpQkFBMUIsRUFBNkM7VUFDekNDLGNBQUo7VUFDSSxDQUFDblMsSUFBSUUsT0FBTCxJQUFnQkYsSUFBSUUsT0FBSixDQUFZbUIsTUFBWixLQUF1QixDQUEzQyxFQUE4QztZQUN4QyxDQUFDLEtBQUtpUSxRQUFWLEVBQW9CO1lBQ2hCLEtBQUtHLGVBQVQsRUFBMEI7ZUFDbkJwSSxJQUFMLENBQVU7ZUFDTG1JLE1BQU01USxDQUFOLEdBQVUsS0FBSzZRLGVBQUwsQ0FBcUI3USxDQUQxQjtlQUVMNFEsTUFBTTNRLENBQU4sR0FBVSxLQUFLNFEsZUFBTCxDQUFxQjVRO1dBRnBDOzthQUtHNFEsZUFBTCxHQUF1QkQsS0FBdkI7O1VBRUV4UixJQUFJRSxPQUFKLElBQWVGLElBQUlFLE9BQUosQ0FBWW1CLE1BQVosS0FBdUIsQ0FBdEMsSUFBMkMsQ0FBQyxLQUFLcVEsa0JBQXJELEVBQXlFO1lBQ25FLENBQUMsS0FBS0gsUUFBVixFQUFvQjtZQUNoQmEsV0FBV3hLLEVBQUVnSyxnQkFBRixDQUFtQjVSLEdBQW5CLEVBQXdCLElBQXhCLENBQWY7WUFDSXFTLFFBQVFELFdBQVcsS0FBS1QsYUFBNUI7YUFDSy9ILElBQUwsQ0FBVXlJLFFBQVEsQ0FBbEIsRUFBcUJoTSxrQkFBckI7YUFDS3NMLGFBQUwsR0FBcUJTLFFBQXJCOztLQXhnQkc7dUJBQUEsaUNBMmdCZ0I7V0FDaEJySyxtQkFBTCxHQUEyQixJQUEzQjtLQTVnQks7Z0JBQUEsd0JBOGdCTy9ILEdBOWdCUCxFQThnQlk7OztVQUNiLEtBQUsrSixRQUFMLElBQWlCLEtBQUt1SSxtQkFBdEIsSUFBNkMsQ0FBQyxLQUFLakwsUUFBTCxFQUFsRCxFQUFtRTtVQUMvRDhLLGNBQUo7V0FDS0ksU0FBTCxHQUFpQixJQUFqQjtVQUNJdlMsSUFBSXdTLFVBQUosR0FBaUIsQ0FBakIsSUFBc0J4UyxJQUFJeVMsTUFBSixHQUFhLENBQW5DLElBQXdDelMsSUFBSTBTLE1BQUosR0FBYSxDQUF6RCxFQUE0RDthQUNyRDlJLElBQUwsQ0FBVSxLQUFLK0ksbUJBQWY7T0FERixNQUVPLElBQUkzUyxJQUFJd1MsVUFBSixHQUFpQixDQUFqQixJQUFzQnhTLElBQUl5UyxNQUFKLEdBQWEsQ0FBbkMsSUFBd0N6UyxJQUFJMFMsTUFBSixHQUFhLENBQXpELEVBQTREO2FBQzVEOUksSUFBTCxDQUFVLENBQUMsS0FBSytJLG1CQUFoQjs7V0FFR2hJLFNBQUwsQ0FBZSxZQUFNO2VBQ2Q0SCxTQUFMLEdBQWlCLEtBQWpCO09BREY7S0F2aEJLO29CQUFBLDRCQTJoQld2UyxHQTNoQlgsRUEyaEJnQjtVQUNqQixLQUFLK0osUUFBTCxJQUFpQixLQUFLNkksa0JBQXRCLElBQTRDLEtBQUt2TCxRQUFMLEVBQTVDLElBQStELENBQUNPLEVBQUVpTCxZQUFGLENBQWU3UyxHQUFmLENBQXBFLEVBQXlGO1dBQ3BGOFMsZUFBTCxHQUF1QixJQUF2QjtLQTdoQks7b0JBQUEsNEJBK2hCVzlTLEdBL2hCWCxFQStoQmdCO1VBQ2pCLENBQUMsS0FBSzhTLGVBQU4sSUFBeUIsQ0FBQ2xMLEVBQUVpTCxZQUFGLENBQWU3UyxHQUFmLENBQTlCLEVBQW1EO1dBQzlDOFMsZUFBTCxHQUF1QixLQUF2QjtLQWppQks7bUJBQUEsMkJBbWlCVTlTLEdBbmlCVixFQW1pQmUsRUFuaUJmO2VBQUEsdUJBcWlCTUEsR0FyaUJOLEVBcWlCVztVQUNaLENBQUMsS0FBSzhTLGVBQU4sSUFBeUIsQ0FBQ2xMLEVBQUVpTCxZQUFGLENBQWU3UyxHQUFmLENBQTlCLEVBQW1EO1dBQzlDOFMsZUFBTCxHQUF1QixLQUF2QjtVQUNJekUsYUFBSjtVQUNJakwsS0FBS3BELElBQUlxRCxZQUFiO1VBQ0ksQ0FBQ0QsRUFBTCxFQUFTO1VBQ0xBLEdBQUcyUCxLQUFQLEVBQWM7YUFDUCxJQUFJOVAsSUFBSSxDQUFSLEVBQVdULE1BQU1ZLEdBQUcyUCxLQUFILENBQVMxUixNQUEvQixFQUF1QzRCLElBQUlULEdBQTNDLEVBQWdEUyxHQUFoRCxFQUFxRDtjQUMvQytQLE9BQU81UCxHQUFHMlAsS0FBSCxDQUFTOVAsQ0FBVCxDQUFYO2NBQ0krUCxLQUFLQyxJQUFMLElBQWEsTUFBakIsRUFBeUI7bUJBQ2hCRCxLQUFLRSxTQUFMLEVBQVA7Ozs7T0FKTixNQVFPO2VBQ0U5UCxHQUFHMkYsS0FBSCxDQUFTLENBQVQsQ0FBUDs7VUFFRXNGLElBQUosRUFBVTthQUNIQyxZQUFMLENBQWtCRCxJQUFsQjs7S0F2akJHOzhCQUFBLHdDQTBqQnVCO1VBQ3hCLEtBQUtyRyxPQUFMLENBQWFDLE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7YUFDdEJELE9BQUwsQ0FBYUMsTUFBYixHQUFzQixDQUF0Qjs7VUFFRSxLQUFLRCxPQUFMLENBQWFFLE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7YUFDdEJGLE9BQUwsQ0FBYUUsTUFBYixHQUFzQixDQUF0Qjs7VUFFRSxLQUFLeUIsV0FBTCxHQUFtQixLQUFLM0IsT0FBTCxDQUFhQyxNQUFoQyxHQUF5QyxLQUFLRCxPQUFMLENBQWF0QixLQUExRCxFQUFpRTthQUMxRHNCLE9BQUwsQ0FBYUMsTUFBYixHQUFzQixFQUFFLEtBQUtELE9BQUwsQ0FBYXRCLEtBQWIsR0FBcUIsS0FBS2lELFdBQTVCLENBQXRCOztVQUVFLEtBQUs2QyxZQUFMLEdBQW9CLEtBQUt4RSxPQUFMLENBQWFFLE1BQWpDLEdBQTBDLEtBQUtGLE9BQUwsQ0FBYXJCLE1BQTNELEVBQW1FO2FBQzVEcUIsT0FBTCxDQUFhRSxNQUFiLEdBQXNCLEVBQUUsS0FBS0YsT0FBTCxDQUFhckIsTUFBYixHQUFzQixLQUFLNkYsWUFBN0IsQ0FBdEI7O0tBcmtCRzsrQkFBQSx5Q0F3a0J3QjtVQUN6QixLQUFLeEUsT0FBTCxDQUFhdEIsS0FBYixHQUFxQixLQUFLaUQsV0FBOUIsRUFBMkM7YUFDcENuQixVQUFMLEdBQWtCLEtBQUttQixXQUFMLEdBQW1CLEtBQUszSSxZQUExQzs7VUFFRSxLQUFLZ0gsT0FBTCxDQUFhckIsTUFBYixHQUFzQixLQUFLNkYsWUFBL0IsRUFBNkM7YUFDdENoRSxVQUFMLEdBQWtCLEtBQUtnRSxZQUFMLEdBQW9CLEtBQUszRixhQUEzQzs7S0E3a0JHO21CQUFBLDZCQWdsQjBDOzs7VUFBaEN0QyxXQUFnQyx1RUFBbEIsQ0FBa0I7VUFBZjRMLGFBQWU7O1VBQzNDLENBQUMsS0FBS3JQLEdBQVYsRUFBZTtVQUNYcVMsY0FBY2hELGlCQUFpQixLQUFLL0gsWUFBTCxDQUFrQjdELFdBQWxCLEtBQWtDLEtBQUtBLFdBQTFFO1VBQ0lBLGNBQWMsQ0FBZCxJQUFtQjRPLFdBQXZCLEVBQW9DO1lBQzlCeE8sT0FBT2lELEVBQUV3TCxlQUFGLENBQWtCRCxjQUFjLEtBQUt6RyxhQUFuQixHQUFtQyxLQUFLNUwsR0FBMUQsRUFBK0R5RCxXQUEvRCxDQUFYO2FBQ0tnSixNQUFMLEdBQWMsWUFBTTtpQkFDYnpNLEdBQUwsR0FBVzZELElBQVg7aUJBQ0s4QyxXQUFMLENBQWlCMEksYUFBakI7U0FGRjtPQUZGLE1BTU87YUFDQTFJLFdBQUwsQ0FBaUIwSSxhQUFqQjs7VUFFRTVMLGVBQWUsQ0FBbkIsRUFBc0I7O2FBRWZBLFdBQUwsR0FBbUJxRCxFQUFFeUwsS0FBRixDQUFRLEtBQUs5TyxXQUFiLENBQW5CO09BRkYsTUFHTyxJQUFJQSxlQUFlLENBQW5CLEVBQXNCOzthQUV0QkEsV0FBTCxHQUFtQnFELEVBQUUwTCxLQUFGLENBQVEsS0FBSy9PLFdBQWIsQ0FBbkI7T0FGSyxNQUdBLElBQUlBLGVBQWUsQ0FBbkIsRUFBc0I7O2FBRXRCQSxXQUFMLEdBQW1CcUQsRUFBRTJMLFFBQUYsQ0FBVyxLQUFLaFAsV0FBaEIsQ0FBbkI7T0FGSyxNQUdBLElBQUlBLGVBQWUsQ0FBbkIsRUFBc0I7O2FBRXRCQSxXQUFMLEdBQW1CcUQsRUFBRTJMLFFBQUYsQ0FBVzNMLEVBQUUyTCxRQUFGLENBQVcsS0FBS2hQLFdBQWhCLENBQVgsQ0FBbkI7T0FGSyxNQUdBLElBQUlBLGVBQWUsQ0FBbkIsRUFBc0I7O2FBRXRCQSxXQUFMLEdBQW1CcUQsRUFBRTJMLFFBQUYsQ0FBVzNMLEVBQUUyTCxRQUFGLENBQVczTCxFQUFFMkwsUUFBRixDQUFXLEtBQUtoUCxXQUFoQixDQUFYLENBQVgsQ0FBbkI7T0FGSyxNQUdBO2FBQ0FBLFdBQUwsR0FBbUJBLFdBQW5COztVQUVFNE8sV0FBSixFQUFpQjthQUNWNU8sV0FBTCxHQUFtQkEsV0FBbkI7O0tBL21CRztvQkFBQSw4QkFrbkJhO1VBQ2RzSSxrQkFBbUIsQ0FBQyxLQUFLQyxXQUFOLElBQXFCLEtBQUtBLFdBQUwsSUFBb0IsU0FBMUMsR0FBdUQsYUFBdkQsR0FBdUUsS0FBS0EsV0FBbEc7V0FDS2xFLEdBQUwsQ0FBU3lELFNBQVQsR0FBcUJRLGVBQXJCO1dBQ0tqRSxHQUFMLENBQVN3QixTQUFULENBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLEtBQUtULFdBQTlCLEVBQTJDLEtBQUs2QyxZQUFoRDtXQUNLNUQsR0FBTCxDQUFTNEssUUFBVCxDQUFrQixDQUFsQixFQUFxQixDQUFyQixFQUF3QixLQUFLN0osV0FBN0IsRUFBMEMsS0FBSzZDLFlBQS9DO0tBdG5CSztTQUFBLG1CQXduQkU7OztXQUNGN0IsU0FBTCxDQUFlLFlBQU07WUFDZixDQUFDLE9BQUs3SixHQUFWLEVBQWU7WUFDWEksT0FBT0kscUJBQVgsRUFBa0M7Z0NBQ1YsT0FBS21TLFVBQTNCO1NBREYsTUFFTztpQkFDQUEsVUFBTDs7T0FMSjtLQXpuQks7Y0FBQSx3QkFrb0JPO1VBQ1I3SyxNQUFNLEtBQUtBLEdBQWY7c0JBQ3dDLEtBQUtaLE9BRmpDO1VBRU5DLE1BRk0sYUFFTkEsTUFGTTtVQUVFQyxNQUZGLGFBRUVBLE1BRkY7VUFFVXhCLEtBRlYsYUFFVUEsS0FGVjtVQUVpQkMsTUFGakIsYUFFaUJBLE1BRmpCOztXQUdQNkQsZ0JBQUw7VUFDSTlGLFNBQUosQ0FBYyxLQUFLNUQsR0FBbkIsRUFBd0JtSCxNQUF4QixFQUFnQ0MsTUFBaEMsRUFBd0N4QixLQUF4QyxFQUErQ0MsTUFBL0M7V0FDSytCLEtBQUwsQ0FBV25DLE9BQU9tTixJQUFsQixFQUF3QjlLLEdBQXhCO1VBQ0ksQ0FBQyxLQUFLckIsUUFBVixFQUFvQjthQUNiQSxRQUFMLEdBQWdCLElBQWhCO2FBQ0ttQixLQUFMLENBQVduQyxPQUFPb04sZUFBbEI7O0tBMW9CRztrQkFBQSw0QkE2b0JXOzs7VUFDWixDQUFDLEtBQUt2TCxZQUFWLEVBQXdCOzBCQUNRLEtBQUtBLFlBRnJCO1VBRVZILE1BRlUsaUJBRVZBLE1BRlU7VUFFRkMsTUFGRSxpQkFFRkEsTUFGRTtVQUVNMEwsS0FGTixpQkFFTUEsS0FGTjs7VUFHWmhNLEVBQUVDLFdBQUYsQ0FBY0ksTUFBZCxDQUFKLEVBQTJCO2FBQ3BCRCxPQUFMLENBQWFDLE1BQWIsR0FBc0JBLE1BQXRCOztVQUVFTCxFQUFFQyxXQUFGLENBQWNLLE1BQWQsQ0FBSixFQUEyQjthQUNwQkYsT0FBTCxDQUFhRSxNQUFiLEdBQXNCQSxNQUF0Qjs7VUFFRU4sRUFBRUMsV0FBRixDQUFjK0wsS0FBZCxDQUFKLEVBQTBCO2FBQ25CcEwsVUFBTCxHQUFrQm9MLEtBQWxCOztXQUVHakosU0FBTCxDQUFlLFlBQU07ZUFDZHZDLFlBQUwsR0FBb0IsSUFBcEI7T0FERjs7O0NBOXlCTjs7QUMvREE7Ozs7OztBQU1BO0FBRUEsSUFBSSxxQkFBcUIsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUM7QUFDekQsSUFBSSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUM7QUFDckQsSUFBSSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDOztBQUU3RCxTQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Q0FDdEIsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7RUFDdEMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO0VBQzdFOztDQUVELE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ25COztBQUVELFNBQVMsZUFBZSxHQUFHO0NBQzFCLElBQUk7RUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtHQUNuQixPQUFPLEtBQUssQ0FBQztHQUNiOzs7OztFQUtELElBQUksS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQzlCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7RUFDaEIsSUFBSSxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0dBQ2pELE9BQU8sS0FBSyxDQUFDO0dBQ2I7OztFQUdELElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztFQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7R0FDNUIsS0FBSyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ3hDO0VBQ0QsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtHQUMvRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNoQixDQUFDLENBQUM7RUFDSCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxFQUFFO0dBQ3JDLE9BQU8sS0FBSyxDQUFDO0dBQ2I7OztFQUdELElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztFQUNmLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNLEVBQUU7R0FDMUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQztHQUN2QixDQUFDLENBQUM7RUFDSCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2hELHNCQUFzQixFQUFFO0dBQ3pCLE9BQU8sS0FBSyxDQUFDO0dBQ2I7O0VBRUQsT0FBTyxJQUFJLENBQUM7RUFDWixDQUFDLE9BQU8sR0FBRyxFQUFFOztFQUViLE9BQU8sS0FBSyxDQUFDO0VBQ2I7Q0FDRDs7QUFFRCxTQUFjLEdBQUcsZUFBZSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxVQUFVLE1BQU0sRUFBRSxNQUFNLEVBQUU7Q0FDOUUsSUFBSSxJQUFJLENBQUM7Q0FDVCxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7Q0FDMUIsSUFBSSxPQUFPLENBQUM7O0NBRVosS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDMUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUFFNUIsS0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7R0FDckIsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNuQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCO0dBQ0Q7O0VBRUQsSUFBSSxxQkFBcUIsRUFBRTtHQUMxQixPQUFPLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDeEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0tBQzVDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEM7SUFDRDtHQUNEO0VBQ0Q7O0NBRUQsT0FBTyxFQUFFLENBQUM7Q0FDVjs7QUN0RkQsSUFBTXlMLGlCQUFpQjtpQkFDTjtDQURqQjs7QUFJQSxJQUFNQyxZQUFZO1dBQ1AsaUJBQVVDLEdBQVYsRUFBZUMsT0FBZixFQUF3QjtjQUNyQkMsTUFBTyxFQUFQLEVBQVdKLGNBQVgsRUFBMkJHLE9BQTNCLENBQVY7UUFDSUUsVUFBVWhQLE9BQU82TyxJQUFJRyxPQUFKLENBQVluUixLQUFaLENBQWtCLEdBQWxCLEVBQXVCLENBQXZCLENBQVAsQ0FBZDtRQUNJbVIsVUFBVSxDQUFkLEVBQWlCO1lBQ1QsSUFBSXhGLEtBQUosdUVBQThFd0YsT0FBOUUsb0RBQU47O1FBRUVDLGdCQUFnQkgsUUFBUUcsYUFBUixJQUF5QixRQUE3Qzs7O1FBR0lDLFNBQUosQ0FBY0QsYUFBZCxFQUE2QkMsU0FBN0I7R0FWYzs7O0NBQWxCOzs7Ozs7OzsifQ==
