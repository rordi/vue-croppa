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
          _this.paintBackground();
          _this.ctx.drawImage(_this.img, -_this.canvas.width / 2, -_this.canvas.height / 2, _this.canvas.height, _this.canvas.width);
        });
      } else {
        this.paintBackground();
        this.ctx.drawImage(this.img, -this.canvas.width / 2, -this.canvas.height / 2, this.canvas.height, this.canvas.width);
      }

      this.ctx.translate(-(this.canvas.width / 2), -(this.canvas.height / 2)); // move to top left corner
      this.draw();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLWNyb3BwYS5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwuanMiLCIuLi8uLi8uLi9zcmMvcHJvcHMuanMiLCIuLi8uLi8uLi9zcmMvZXZlbnRzLmpzIiwiLi4vLi4vLi4vc3JjL2Nyb3BwZXIudnVlIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2FudmFzRXhpZk9yaWVudGF0aW9uIGZyb20gJ2NhbnZhcy1leGlmLW9yaWVudGF0aW9uJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gIG9uZVBvaW50Q29vcmQgKHBvaW50LCB2bSkge1xyXG4gICAgbGV0IHsgY2FudmFzLCBxdWFsaXR5IH0gPSB2bVxyXG4gICAgbGV0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgIGxldCBjbGllbnRYID0gcG9pbnQuY2xpZW50WFxyXG4gICAgbGV0IGNsaWVudFkgPSBwb2ludC5jbGllbnRZXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiAoY2xpZW50WCAtIHJlY3QubGVmdCkgKiBxdWFsaXR5LFxyXG4gICAgICB5OiAoY2xpZW50WSAtIHJlY3QudG9wKSAqIHF1YWxpdHlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBnZXRQb2ludGVyQ29vcmRzIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlclxyXG4gICAgaWYgKGV2dC50b3VjaGVzICYmIGV2dC50b3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQudG91Y2hlc1swXVxyXG4gICAgfSBlbHNlIGlmIChldnQuY2hhbmdlZFRvdWNoZXMgJiYgZXZ0LmNoYW5nZWRUb3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQuY2hhbmdlZFRvdWNoZXNbMF1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnRcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlciwgdm0pXHJcbiAgfSxcclxuXHJcbiAgZ2V0UGluY2hEaXN0YW5jZSAoZXZ0LCB2bSkge1xyXG4gICAgbGV0IHBvaW50ZXIxID0gZXZ0LnRvdWNoZXNbMF1cclxuICAgIGxldCBwb2ludGVyMiA9IGV2dC50b3VjaGVzWzFdXHJcbiAgICBsZXQgY29vcmQxID0gdGhpcy5vbmVQb2ludENvb3JkKHBvaW50ZXIxLCB2bSlcclxuICAgIGxldCBjb29yZDIgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjIsIHZtKVxyXG5cclxuICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coY29vcmQxLnggLSBjb29yZDIueCwgMikgKyBNYXRoLnBvdyhjb29yZDEueSAtIGNvb3JkMi55LCAyKSlcclxuICB9LFxyXG5cclxuICBnZXRQaW5jaENlbnRlckNvb3JkIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlcjEgPSBldnQudG91Y2hlc1swXVxyXG4gICAgbGV0IHBvaW50ZXIyID0gZXZ0LnRvdWNoZXNbMV1cclxuICAgIGxldCBjb29yZDEgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjEsIHZtKVxyXG4gICAgbGV0IGNvb3JkMiA9IHRoaXMub25lUG9pbnRDb29yZChwb2ludGVyMiwgdm0pXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogKGNvb3JkMS54ICsgY29vcmQyLngpIC8gMixcclxuICAgICAgeTogKGNvb3JkMS55ICsgY29vcmQyLnkpIC8gMlxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGltYWdlTG9hZGVkIChpbWcpIHtcclxuICAgIHJldHVybiBpbWcuY29tcGxldGUgJiYgaW1nLm5hdHVyYWxXaWR0aCAhPT0gMFxyXG4gIH0sXHJcblxyXG4gIHJBRlBvbHlmaWxsICgpIHtcclxuICAgIC8vIHJBRiBwb2x5ZmlsbFxyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnKSByZXR1cm5cclxuICAgIHZhciBsYXN0VGltZSA9IDBcclxuICAgIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J11cclxuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCAgICAvLyBXZWJraXTkuK3mraTlj5bmtojmlrnms5XnmoTlkI3lrZflj5jkuoZcclxuICAgICAgICB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKClcclxuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2LjcgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpXHJcbiAgICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGFyZyA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbFxyXG4gICAgICAgICAgY2FsbGJhY2soYXJnKVxyXG4gICAgICAgIH0sIHRpbWVUb0NhbGwpXHJcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGxcclxuICAgICAgICByZXR1cm4gaWRcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uIChhcmcpIHtcclxuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmcpID09PSAnW29iamVjdCBBcnJheV0nXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdG9CbG9iUG9seWZpbGwgKCkge1xyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnIHx8ICFIVE1MQ2FudmFzRWxlbWVudCkgcmV0dXJuXHJcbiAgICB2YXIgYmluU3RyLCBsZW4sIGFyclxyXG4gICAgaWYgKCFIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUudG9CbG9iKSB7XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUsICd0b0Jsb2InLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChjYWxsYmFjaywgdHlwZSwgcXVhbGl0eSkge1xyXG4gICAgICAgICAgYmluU3RyID0gYXRvYih0aGlzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KS5zcGxpdCgnLCcpWzFdKVxyXG4gICAgICAgICAgbGVuID0gYmluU3RyLmxlbmd0aFxyXG4gICAgICAgICAgYXJyID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG5cclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgYXJyW2ldID0gYmluU3RyLmNoYXJDb2RlQXQoaSlcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjYWxsYmFjayhuZXcgQmxvYihbYXJyXSwgeyB0eXBlOiB0eXBlIHx8ICdpbWFnZS9wbmcnIH0pKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBldmVudEhhc0ZpbGUgKGV2dCkge1xyXG4gICAgdmFyIGR0ID0gZXZ0LmRhdGFUcmFuc2ZlciB8fCBldnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXJcclxuICAgIGlmIChkdC50eXBlcykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZHQudHlwZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICBpZiAoZHQudHlwZXNbaV0gPT0gJ0ZpbGVzJykge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9LFxyXG5cclxuICBnZXRGaWxlT3JpZW50YXRpb24gKGFycmF5QnVmZmVyKSB7XHJcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhhcnJheUJ1ZmZlcilcclxuICAgIGlmICh2aWV3LmdldFVpbnQxNigwLCBmYWxzZSkgIT0gMHhGRkQ4KSByZXR1cm4gLTJcclxuICAgIHZhciBsZW5ndGggPSB2aWV3LmJ5dGVMZW5ndGhcclxuICAgIHZhciBvZmZzZXQgPSAyXHJcbiAgICB3aGlsZSAob2Zmc2V0IDwgbGVuZ3RoKSB7XHJcbiAgICAgIHZhciBtYXJrZXIgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICBpZiAobWFya2VyID09IDB4RkZFMSkge1xyXG4gICAgICAgIGlmICh2aWV3LmdldFVpbnQzMihvZmZzZXQgKz0gMiwgZmFsc2UpICE9IDB4NDU3ODY5NjYpIHJldHVybiAtMVxyXG4gICAgICAgIHZhciBsaXR0bGUgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQgKz0gNiwgZmFsc2UpID09IDB4NDk0OVxyXG4gICAgICAgIG9mZnNldCArPSB2aWV3LmdldFVpbnQzMihvZmZzZXQgKyA0LCBsaXR0bGUpXHJcbiAgICAgICAgdmFyIHRhZ3MgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGxpdHRsZSlcclxuICAgICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnczsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAodmlldy5nZXRVaW50MTYob2Zmc2V0ICsgKGkgKiAxMiksIGxpdHRsZSkgPT0gMHgwMTEyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2aWV3LmdldFVpbnQxNihvZmZzZXQgKyAoaSAqIDEyKSArIDgsIGxpdHRsZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAoKG1hcmtlciAmIDB4RkYwMCkgIT0gMHhGRjAwKSBicmVha1xyXG4gICAgICBlbHNlIG9mZnNldCArPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xXHJcbiAgfSxcclxuXHJcbiAgYmFzZTY0VG9BcnJheUJ1ZmZlciAoYmFzZTY0KSB7XHJcbiAgICBiYXNlNjQgPSBiYXNlNjQucmVwbGFjZSgvXmRhdGE6KFteO10rKTtiYXNlNjQsL2dtaSwgJycpXHJcbiAgICB2YXIgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjQpXHJcbiAgICB2YXIgbGVuID0gYmluYXJ5U3RyaW5nLmxlbmd0aFxyXG4gICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnl0ZXMuYnVmZmVyXHJcbiAgfSxcclxuXHJcbiAgZ2V0Um90YXRlZEltYWdlIChpbWcsIG9yaWVudGF0aW9uKSB7XHJcbiAgICB2YXIgX2NhbnZhcyA9IENhbnZhc0V4aWZPcmllbnRhdGlvbi5kcmF3SW1hZ2UoaW1nLCBvcmllbnRhdGlvbilcclxuICAgIHZhciBfaW1nID0gbmV3IEltYWdlKClcclxuICAgIF9pbWcuc3JjID0gX2NhbnZhcy50b0RhdGFVUkwoKVxyXG4gICAgcmV0dXJuIF9pbWdcclxuICB9LFxyXG5cclxuICBmbGlwWCAob3JpKSB7XHJcbiAgICBpZiAob3JpICUgMiA9PSAwKSB7XHJcbiAgICAgIHJldHVybiBvcmkgLSAxXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9yaSArIDFcclxuICB9LFxyXG5cclxuICBmbGlwWSAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDQsXHJcbiAgICAgIDQ6IDEsXHJcbiAgICAgIDI6IDMsXHJcbiAgICAgIDM6IDIsXHJcbiAgICAgIDU6IDgsXHJcbiAgICAgIDg6IDUsXHJcbiAgICAgIDY6IDcsXHJcbiAgICAgIDc6IDZcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICByb3RhdGU5MCAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDYsXHJcbiAgICAgIDI6IDcsXHJcbiAgICAgIDM6IDgsXHJcbiAgICAgIDQ6IDUsXHJcbiAgICAgIDU6IDIsXHJcbiAgICAgIDY6IDMsXHJcbiAgICAgIDc6IDQsXHJcbiAgICAgIDg6IDFcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICBudW1iZXJWYWxpZCAobikge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiAhaXNOYU4obilcclxuICB9XHJcbn0iLCJOdW1iZXIuaXNJbnRlZ2VyID0gTnVtYmVyLmlzSW50ZWdlciB8fCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZSh2YWx1ZSkgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlXHJcbn1cclxuXHJcbnZhciBpbml0aWFsSW1hZ2VUeXBlID0gU3RyaW5nXHJcbmlmICh3aW5kb3cgJiYgd2luZG93LkltYWdlKSB7XHJcbiAgaW5pdGlhbEltYWdlVHlwZSA9IFtTdHJpbmcsIEltYWdlXVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgdmFsdWU6IE9iamVjdCxcclxuICB3aWR0aDoge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMjAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBoZWlnaHQ6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDIwMCxcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGxhY2Vob2xkZXI6IHtcclxuICAgIHR5cGU6IFN0cmluZyxcclxuICAgIGRlZmF1bHQ6ICdDaG9vc2UgYW4gaW1hZ2UnXHJcbiAgfSxcclxuICBwbGFjZWhvbGRlckNvbG9yOiB7XHJcbiAgICBkZWZhdWx0OiAnIzYwNjA2MCdcclxuICB9LFxyXG4gIHBsYWNlaG9sZGVyRm9udFNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDAsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgcmV0dXJuIHZhbCA+PSAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBjYW52YXNDb2xvcjoge1xyXG4gICAgZGVmYXVsdDogJ3RyYW5zcGFyZW50J1xyXG4gIH0sXHJcbiAgcXVhbGl0eToge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMixcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgem9vbVNwZWVkOiB7XHJcbiAgICBkZWZhdWx0OiAzLFxyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBhY2NlcHQ6IFN0cmluZyxcclxuICBmaWxlU2l6ZUxpbWl0OiB7XHJcbiAgICB0eXBlOiBOdW1iZXIsXHJcbiAgICBkZWZhdWx0OiAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPj0gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZGlzYWJsZWQ6IEJvb2xlYW4sXHJcbiAgZGlzYWJsZURyYWdBbmREcm9wOiBCb29sZWFuLFxyXG4gIGRpc2FibGVDbGlja1RvQ2hvb3NlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVEcmFnVG9Nb3ZlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVTY3JvbGxUb1pvb206IEJvb2xlYW4sXHJcbiAgZGlzYWJsZVBpbmNoVG9ab29tOiBCb29sZWFuLFxyXG4gIGRpc2FibGVSb3RhdGlvbjogQm9vbGVhbixcclxuICByZXZlcnNlU2Nyb2xsVG9ab29tOiBCb29sZWFuLFxyXG4gIHByZXZlbnRXaGl0ZVNwYWNlOiBCb29sZWFuLFxyXG4gIHNob3dSZW1vdmVCdXR0b246IHtcclxuICAgIHR5cGU6IEJvb2xlYW4sXHJcbiAgICBkZWZhdWx0OiB0cnVlXHJcbiAgfSxcclxuICByZW1vdmVCdXR0b25Db2xvcjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ3JlZCdcclxuICB9LFxyXG4gIHJlbW92ZUJ1dHRvblNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlclxyXG4gIH0sXHJcbiAgaW5pdGlhbEltYWdlOiBpbml0aWFsSW1hZ2VUeXBlLFxyXG4gIGluaXRpYWxTaXplOiB7XHJcbiAgICB0eXBlOiBTdHJpbmcsXHJcbiAgICBkZWZhdWx0OiAnY292ZXInLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPT09ICdjb3ZlcicgfHwgdmFsID09PSAnY29udGFpbicgfHwgdmFsID09PSAnbmF0dXJhbCdcclxuICAgIH1cclxuICB9LFxyXG4gIGluaXRpYWxQb3NpdGlvbjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ2NlbnRlcicsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgdmFyIHZhbGlkcyA9IFtcclxuICAgICAgICAnY2VudGVyJyxcclxuICAgICAgICAndG9wJyxcclxuICAgICAgICAnYm90dG9tJyxcclxuICAgICAgICAnbGVmdCcsXHJcbiAgICAgICAgJ3JpZ2h0J1xyXG4gICAgICBdXHJcbiAgICAgIHJldHVybiB2YWwuc3BsaXQoJyAnKS5ldmVyeSh3b3JkID0+IHtcclxuICAgICAgICByZXR1cm4gdmFsaWRzLmluZGV4T2Yod29yZCkgPj0gMFxyXG4gICAgICB9KSB8fCAvXi0/XFxkKyUgLT9cXGQrJSQvLnRlc3QodmFsKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgaW5wdXRBdHRyczogT2JqZWN0XHJcbn0iLCJleHBvcnQgZGVmYXVsdCB7XG4gIElOSVRfRVZFTlQ6ICdpbml0JyxcbiAgRklMRV9DSE9PU0VfRVZFTlQ6ICdmaWxlLWNob29zZScsXG4gIEZJTEVfU0laRV9FWENFRURfRVZFTlQ6ICdmaWxlLXNpemUtZXhjZWVkJyxcbiAgRklMRV9UWVBFX01JU01BVENIX0VWRU5UOiAnZmlsZS10eXBlLW1pc21hdGNoJyxcbiAgTkVXX0lNQUdFOiAnbmV3LWltYWdlJyxcbiAgTkVXX0lNQUdFX0RSQVdOOiAnbmV3LWltYWdlLWRyYXduJyxcbiAgSU1BR0VfUkVNT1ZFX0VWRU5UOiAnaW1hZ2UtcmVtb3ZlJyxcbiAgTU9WRV9FVkVOVDogJ21vdmUnLFxuICBST1RBVEVfRVZFTlQ6ICdyb3RhdGUnLFxuICBaT09NX0VWRU5UOiAnem9vbScsXG4gIERSQVc6ICdkcmF3JyxcbiAgSU5JVElBTF9JTUFHRV9MT0FERURfRVZFTlQ6ICdpbml0aWFsLWltYWdlLWxvYWRlZCdcbn1cbiIsIjx0ZW1wbGF0ZT5cclxuICA8ZGl2IHJlZj1cIndyYXBwZXJcIlxyXG4gICAgICAgOmNsYXNzPVwiYGNyb3BwYS1jb250YWluZXIgJHtpbWcgPyAnY3JvcHBhLS1oYXMtdGFyZ2V0JyA6ICcnfSAke2Rpc2FibGVkID8gJ2Nyb3BwYS0tZGlzYWJsZWQnIDogJyd9ICR7ZGlzYWJsZUNsaWNrVG9DaG9vc2UgPyAnY3JvcHBhLS1kaXNhYmxlZC1jYycgOiAnJ30gJHtkaXNhYmxlRHJhZ1RvTW92ZSAmJiBkaXNhYmxlU2Nyb2xsVG9ab29tID8gJ2Nyb3BwYS0tZGlzYWJsZWQtbXonIDogJyd9ICR7ZmlsZURyYWdnZWRPdmVyID8gJ2Nyb3BwYS0tZHJvcHpvbmUnIDogJyd9YFwiXHJcbiAgICAgICBAZHJhZ2VudGVyLnN0b3AucHJldmVudD1cIl9oYW5kbGVEcmFnRW50ZXJcIlxyXG4gICAgICAgQGRyYWdsZWF2ZS5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ0xlYXZlXCJcclxuICAgICAgIEBkcmFnb3Zlci5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ092ZXJcIlxyXG4gICAgICAgQGRyb3Auc3RvcC5wcmV2ZW50PVwiX2hhbmRsZURyb3BcIj5cclxuICAgIDxpbnB1dCB0eXBlPVwiZmlsZVwiXHJcbiAgICAgICAgICAgOmFjY2VwdD1cImFjY2VwdFwiXHJcbiAgICAgICAgICAgOmRpc2FibGVkPVwiZGlzYWJsZWRcIlxyXG4gICAgICAgICAgIHYtYmluZD1cImlucHV0QXR0cnNcIlxyXG4gICAgICAgICAgIHJlZj1cImZpbGVJbnB1dFwiXHJcbiAgICAgICAgICAgQGNoYW5nZT1cIl9oYW5kbGVJbnB1dENoYW5nZVwiXHJcbiAgICAgICAgICAgc3R5bGU9XCJoZWlnaHQ6MXB4O3dpZHRoOjFweDtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWxlZnQ6LTk5OTk5cHg7cG9zaXRpb246YWJzb2x1dGU7XCIgLz5cclxuICAgIDxkaXYgY2xhc3M9XCJzbG90c1wiXHJcbiAgICAgICAgIHN0eWxlPVwid2lkdGg6IDA7IGhlaWdodDogMDsgdmlzaWJpbGl0eTogaGlkZGVuO1wiPlxyXG4gICAgICA8c2xvdCBuYW1lPVwiaW5pdGlhbFwiPjwvc2xvdD5cclxuICAgICAgPHNsb3QgbmFtZT1cInBsYWNlaG9sZGVyXCI+PC9zbG90PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8Y2FudmFzIHJlZj1cImNhbnZhc1wiXHJcbiAgICAgICAgICAgIEBjbGljay5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlQ2xpY2tcIlxyXG4gICAgICAgICAgICBAdG91Y2hzdGFydC5zdG9wPVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBtb3VzZWRvd24uc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBwb2ludGVyc3RhcnQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGVuZC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEBtb3VzZXVwLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyRW5kXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJlbmQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJFbmRcIlxyXG4gICAgICAgICAgICBAcG9pbnRlcmNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaG1vdmUuc3RvcD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBtb3VzZW1vdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJNb3ZlXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJtb3ZlLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBwb2ludGVybGVhdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJMZWF2ZVwiXHJcbiAgICAgICAgICAgIEBET01Nb3VzZVNjcm9sbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCJcclxuICAgICAgICAgICAgQHdoZWVsLnN0b3A9XCJfaGFuZGxlV2hlZWxcIlxyXG4gICAgICAgICAgICBAbW91c2V3aGVlbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCI+PC9jYW52YXM+XHJcbiAgICA8c3ZnIGNsYXNzPVwiaWNvbiBpY29uLXJlbW92ZVwiXHJcbiAgICAgICAgIHYtaWY9XCJzaG93UmVtb3ZlQnV0dG9uICYmIGltZ1wiXHJcbiAgICAgICAgIEBjbGljaz1cInJlbW92ZVwiXHJcbiAgICAgICAgIDpzdHlsZT1cImB0b3A6IC0ke2hlaWdodC80MH1weDsgcmlnaHQ6IC0ke3dpZHRoLzQwfXB4YFwiXHJcbiAgICAgICAgIHZpZXdCb3g9XCIwIDAgMTAyNCAxMDI0XCJcclxuICAgICAgICAgdmVyc2lvbj1cIjEuMVwiXHJcbiAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxyXG4gICAgICAgICB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIlxyXG4gICAgICAgICA6d2lkdGg9XCJyZW1vdmVCdXR0b25TaXplIHx8IHdpZHRoLzEwXCJcclxuICAgICAgICAgOmhlaWdodD1cInJlbW92ZUJ1dHRvblNpemUgfHwgd2lkdGgvMTBcIj5cclxuICAgICAgPHBhdGggZD1cIk01MTEuOTIxMjMxIDBDMjI5LjE3OTA3NyAwIDAgMjI5LjI1Nzg0NiAwIDUxMiAwIDc5NC43MDI3NjkgMjI5LjE3OTA3NyAxMDI0IDUxMS45MjEyMzEgMTAyNCA3OTQuNzgxNTM4IDEwMjQgMTAyNCA3OTQuNzAyNzY5IDEwMjQgNTEyIDEwMjQgMjI5LjI1Nzg0NiA3OTQuNzgxNTM4IDAgNTExLjkyMTIzMSAwWk03MzIuMDQxODQ2IDY1MC42MzM4NDYgNjUwLjUxNTY5MiA3MzIuMDgxMjMxQzY1MC41MTU2OTIgNzMyLjA4MTIzMSA1MjEuNDkxNjkyIDU5My42ODM2OTIgNTExLjg4MTg0NiA1OTMuNjgzNjkyIDUwMi40Mjk1MzggNTkzLjY4MzY5MiAzNzMuMzY2MTU0IDczMi4wODEyMzEgMzczLjM2NjE1NCA3MzIuMDgxMjMxTDI5MS43NjEyMzEgNjUwLjYzMzg0NkMyOTEuNzYxMjMxIDY1MC42MzM4NDYgNDMwLjMxNjMwOCA1MjMuNTAwMzA4IDQzMC4zMTYzMDggNTEyLjE5NjkyMyA0MzAuMzE2MzA4IDUwMC42OTY2MTUgMjkxLjc2MTIzMSAzNzMuNTIzNjkyIDI5MS43NjEyMzEgMzczLjUyMzY5MkwzNzMuMzY2MTU0IDI5MS45MTg3NjlDMzczLjM2NjE1NCAyOTEuOTE4NzY5IDUwMy40NTM1MzggNDMwLjM5NTA3NyA1MTEuODgxODQ2IDQzMC4zOTUwNzcgNTIwLjM0OTUzOCA0MzAuMzk1MDc3IDY1MC41MTU2OTIgMjkxLjkxODc2OSA2NTAuNTE1NjkyIDI5MS45MTg3NjlMNzMyLjA0MTg0NiAzNzMuNTIzNjkyQzczMi4wNDE4NDYgMzczLjUyMzY5MiA1OTMuNDQ3Mzg1IDUwMi41NDc2OTIgNTkzLjQ0NzM4NSA1MTIuMTk2OTIzIDU5My40NDczODUgNTIxLjQxMjkyMyA3MzIuMDQxODQ2IDY1MC42MzM4NDYgNzMyLjA0MTg0NiA2NTAuNjMzODQ2WlwiXHJcbiAgICAgICAgICAgIDpmaWxsPVwicmVtb3ZlQnV0dG9uQ29sb3JcIj48L3BhdGg+XHJcbiAgICA8L3N2Zz5cclxuICA8L2Rpdj5cclxuPC90ZW1wbGF0ZT5cclxuXHJcbjxzY3JpcHQ+XHJcbiAgaW1wb3J0IHUgZnJvbSAnLi91dGlsJ1xyXG4gIGltcG9ydCBwcm9wcyBmcm9tICcuL3Byb3BzJ1xyXG4gIGltcG9ydCBldmVudHMgZnJvbSAnLi9ldmVudHMnXHJcbiAgY29uc3QgUENUX1BFUl9aT09NID0gMSAvIDEwMDAwMCAvLyBUaGUgYW1vdW50IG9mIHpvb21pbmcgZXZlcnl0aW1lIGl0IGhhcHBlbnMsIGluIHBlcmNlbnRhZ2Ugb2YgaW1hZ2Ugd2lkdGguXHJcbiAgY29uc3QgTUlOX01TX1BFUl9DTElDSyA9IDUwMCAvLyBJZiB0b3VjaCBkdXJhdGlvbiBpcyBzaG9ydGVyIHRoYW4gdGhlIHZhbHVlLCB0aGVuIGl0IGlzIGNvbnNpZGVyZWQgYXMgYSBjbGljay5cclxuICBjb25zdCBDTElDS19NT1ZFX1RIUkVTSE9MRCA9IDEwMCAvLyBJZiB0b3VjaCBtb3ZlIGRpc3RhbmNlIGlzIGdyZWF0ZXIgdGhhbiB0aGlzIHZhbHVlLCB0aGVuIGl0IHdpbGwgYnkgbm8gbWVhbiBiZSBjb25zaWRlcmVkIGFzIGEgY2xpY2suXHJcbiAgY29uc3QgTUlOX1dJRFRIID0gMTAgLy8gVGhlIG1pbmltYWwgd2lkdGggdGhlIHVzZXIgY2FuIHpvb20gdG8uXHJcbiAgY29uc3QgREVGQVVMVF9QTEFDRUhPTERFUl9UQUtFVVAgPSAyIC8gMyAvLyBQbGFjZWhvbGRlciB0ZXh0IGJ5IGRlZmF1bHQgdGFrZXMgdXAgdGhpcyBhbW91bnQgb2YgdGltZXMgb2YgY2FudmFzIHdpZHRoLlxyXG4gIGNvbnN0IFBJTkNIX0FDQ0VMRVJBVElPTiA9IDEgLy8gVGhlIGFtb3VudCBvZiB0aW1lcyBieSB3aGljaCB0aGUgcGluY2hpbmcgaXMgbW9yZSBzZW5zaXRpdmUgdGhhbiB0aGUgc2NvbGxpbmdcclxuICAvLyBjb25zdCBERUJVRyA9IGZhbHNlXHJcbiAgZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgbW9kZWw6IHtcclxuICAgICAgcHJvcDogJ3ZhbHVlJyxcclxuICAgICAgZXZlbnQ6IGV2ZW50cy5JTklUX0VWRU5UXHJcbiAgICB9LFxyXG4gICAgcHJvcHM6IHByb3BzLFxyXG4gICAgZGF0YSAoKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY2FudmFzOiBudWxsLFxyXG4gICAgICAgIGN0eDogbnVsbCxcclxuICAgICAgICBvcmlnaW5hbEltYWdlOiBudWxsLFxyXG4gICAgICAgIGltZzogbnVsbCxcclxuICAgICAgICBkcmFnZ2luZzogZmFsc2UsXHJcbiAgICAgICAgbGFzdE1vdmluZ0Nvb3JkOiBudWxsLFxyXG4gICAgICAgIGltZ0RhdGE6IHtcclxuICAgICAgICAgIHdpZHRoOiAwLFxyXG4gICAgICAgICAgaGVpZ2h0OiAwLFxyXG4gICAgICAgICAgc3RhcnRYOiAwLFxyXG4gICAgICAgICAgc3RhcnRZOiAwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaWxlRHJhZ2dlZE92ZXI6IGZhbHNlLFxyXG4gICAgICAgIHRhYlN0YXJ0OiAwLFxyXG4gICAgICAgIHNjcm9sbGluZzogZmFsc2UsXHJcbiAgICAgICAgcGluY2hpbmc6IGZhbHNlLFxyXG4gICAgICAgIHBpbmNoRGlzdGFuY2U6IDAsXHJcbiAgICAgICAgc3VwcG9ydFRvdWNoOiBmYWxzZSxcclxuICAgICAgICBwb2ludGVyTW92ZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBvaW50ZXJTdGFydENvb3JkOiBudWxsLFxyXG4gICAgICAgIG5hdHVyYWxXaWR0aDogMCxcclxuICAgICAgICBuYXR1cmFsSGVpZ2h0OiAwLFxyXG4gICAgICAgIHNjYWxlUmF0aW86IG51bGwsXHJcbiAgICAgICAgb3JpZW50YXRpb246IDEsXHJcbiAgICAgICAgdXNlck1ldGFkYXRhOiBudWxsLFxyXG4gICAgICAgIGltYWdlU2V0OiBmYWxzZSxcclxuICAgICAgICBjdXJyZW50UG9pbnRlckNvb3JkOiBudWxsXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjb21wdXRlZDoge1xyXG4gICAgICBvdXRwdXRXaWR0aCAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMud2lkdGggKiB0aGlzLnF1YWxpdHlcclxuICAgICAgfSxcclxuICAgICAgb3V0cHV0SGVpZ2h0ICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5oZWlnaHQgKiB0aGlzLnF1YWxpdHlcclxuICAgICAgfSxcclxuICAgICAgY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wbGFjZWhvbGRlckZvbnRTaXplICogdGhpcy5xdWFsaXR5XHJcbiAgICAgIH0sXHJcbiAgICAgIGFzcGVjdFJhdGlvICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5uYXR1cmFsV2lkdGggLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG1vdW50ZWQgKCkge1xyXG4gICAgICB0aGlzLl9pbml0KClcclxuICAgICAgdS5yQUZQb2x5ZmlsbCgpXHJcbiAgICAgIHUudG9CbG9iUG9seWZpbGwoKVxyXG4gICAgICBsZXQgc3VwcG9ydHMgPSB0aGlzLnN1cHBvcnREZXRlY3Rpb24oKVxyXG4gICAgICBpZiAoIXN1cHBvcnRzLmJhc2ljKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB2dWUtY3JvcHBhIGZ1bmN0aW9uYWxpdHkuJylcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIG91dHB1dFdpZHRoOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMuX3NldFNpemUoKVxyXG4gICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBvdXRwdXRIZWlnaHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkge1xyXG4gICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmICh0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW1hZ2VTZXQgPSBmYWxzZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhpcy5fc2V0U2l6ZSgpXHJcbiAgICAgICAgICB0aGlzLl9wbGFjZUltYWdlKClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNhbnZhc0NvbG9yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLl9kcmF3KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHBsYWNlaG9sZGVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgcGxhY2Vob2xkZXJDb2xvcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICB0aGlzLl9pbml0KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICB0aGlzLl9pbml0KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHByZXZlbnRXaGl0ZVNwYWNlICh2YWwpIHtcclxuICAgICAgICBpZiAodmFsKSB7XHJcbiAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgIH0sXHJcbiAgICAgIHNjYWxlUmF0aW8gKHZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgIGlmICghdS5udW1iZXJWYWxpZCh2YWwpKSByZXR1cm5cclxuICAgICAgICB2YXIgeCA9IDFcclxuICAgICAgICBpZiAodS5udW1iZXJWYWxpZChvbGRWYWwpICYmIG9sZFZhbCAhPT0gMCkge1xyXG4gICAgICAgICAgeCA9IHZhbCAvIG9sZFZhbFxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcG9zID0gdGhpcy5jdXJyZW50UG9pbnRlckNvb3JkIHx8IHtcclxuICAgICAgICAgIHg6IHRoaXMuaW1nRGF0YS5zdGFydFggKyB0aGlzLmltZ0RhdGEud2lkdGggLyAyLFxyXG4gICAgICAgICAgeTogdGhpcy5pbWdEYXRhLnN0YXJ0WSArIHRoaXMuaW1nRGF0YS5oZWlnaHQgLyAyXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoICogdmFsXHJcbiAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodCAqIHZhbFxyXG4gICAgICAgIGlmICh0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICB0aGlzLl9wcmV2ZW50Wm9vbWluZ1RvV2hpdGVTcGFjZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnVzZXJNZXRhZGF0YSkgcmV0dXJuXHJcbiAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLSEhIS0tLS0tLS0tLS0nKVxyXG4gICAgICAgIGxldCBvZmZzZXRYID0gKHggLSAxKSAqIChwb3MueCAtIHRoaXMuaW1nRGF0YS5zdGFydFgpXHJcbiAgICAgICAgbGV0IG9mZnNldFkgPSAoeCAtIDEpICogKHBvcy55IC0gdGhpcy5pbWdEYXRhLnN0YXJ0WSlcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gdGhpcy5pbWdEYXRhLnN0YXJ0WCAtIG9mZnNldFhcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gdGhpcy5pbWdEYXRhLnN0YXJ0WSAtIG9mZnNldFlcclxuICAgICAgfSxcclxuICAgICAgJ2ltZ0RhdGEud2lkdGgnOiBmdW5jdGlvbiAodmFsLCBvbGRWYWwpIHtcclxuICAgICAgICBpZiAoIXUubnVtYmVyVmFsaWQodmFsKSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdmFsIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICBpZiAodGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICBpZiAoTWF0aC5hYnModmFsIC0gb2xkVmFsKSA+ICh2YWwgKiAoMSAvIDEwMDAwMCkpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLlpPT01fRVZFTlQpXHJcbiAgICAgICAgICAgIHRoaXMuX2RyYXcoKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgJ2ltZ0RhdGEuaGVpZ2h0JzogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgIGlmICghdS5udW1iZXJWYWxpZCh2YWwpKSByZXR1cm5cclxuICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB2YWwgLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuICAgICAgZ2V0Q2FudmFzICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jYW52YXNcclxuICAgICAgfSxcclxuICAgICAgZ2V0Q29udGV4dCAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY3R4XHJcbiAgICAgIH0sXHJcbiAgICAgIGdldENob3NlbkZpbGUgKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRyZWZzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICB9LFxyXG4gICAgICBtb3ZlIChvZmZzZXQpIHtcclxuICAgICAgICBpZiAoIW9mZnNldCkgcmV0dXJuXHJcbiAgICAgICAgbGV0IG9sZFggPSB0aGlzLmltZ0RhdGEuc3RhcnRYXHJcbiAgICAgICAgbGV0IG9sZFkgPSB0aGlzLmltZ0RhdGEuc3RhcnRZXHJcbiAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCArPSBvZmZzZXQueFxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgKz0gb2Zmc2V0LnlcclxuICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgdGhpcy5fcHJldmVudE1vdmluZ1RvV2hpdGVTcGFjZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEuc3RhcnRYICE9PSBvbGRYIHx8IHRoaXMuaW1nRGF0YS5zdGFydFkgIT09IG9sZFkpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk1PVkVfRVZFTlQpXHJcbiAgICAgICAgICB0aGlzLl9kcmF3KClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVVcHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogLWFtb3VudCB9KVxyXG4gICAgICB9LFxyXG4gICAgICBtb3ZlRG93bndhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogYW1vdW50IH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVMZWZ0d2FyZHMgKGFtb3VudCA9IDEpIHtcclxuICAgICAgICB0aGlzLm1vdmUoeyB4OiAtYW1vdW50LCB5OiAwIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIG1vdmVSaWdodHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlKHsgeDogYW1vdW50LCB5OiAwIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIHpvb20gKHpvb21JbiA9IHRydWUsIGFjY2VsZXJhdGlvbiA9IDEpIHtcclxuICAgICAgICBsZXQgcmVhbFNwZWVkID0gdGhpcy56b29tU3BlZWQgKiBhY2NlbGVyYXRpb25cclxuICAgICAgICBsZXQgc3BlZWQgPSAodGhpcy5vdXRwdXRXaWR0aCAqIFBDVF9QRVJfWk9PTSkgKiByZWFsU3BlZWRcclxuICAgICAgICBsZXQgeCA9IDFcclxuICAgICAgICBpZiAoem9vbUluKSB7XHJcbiAgICAgICAgICB4ID0gMSArIHNwZWVkXHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmltZ0RhdGEud2lkdGggPiBNSU5fV0lEVEgpIHtcclxuICAgICAgICAgIHggPSAxIC0gc3BlZWRcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zY2FsZVJhdGlvICo9IHhcclxuICAgICAgfSxcclxuICAgICAgem9vbUluICgpIHtcclxuICAgICAgICB0aGlzLnpvb20odHJ1ZSlcclxuICAgICAgfSxcclxuICAgICAgem9vbU91dCAoKSB7XHJcbiAgICAgICAgdGhpcy56b29tKGZhbHNlKVxyXG4gICAgICB9LFxyXG4gICAgICByb3RhdGUgKHN0ZXAgPSAxKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVJvdGF0aW9uIHx8IHRoaXMuZGlzYWJsZWQpIHJldHVyblxyXG4gICAgICAgIHN0ZXAgPSBwYXJzZUludChzdGVwKVxyXG4gICAgICAgIGlmIChpc05hTihzdGVwKSB8fCBzdGVwID4gMyB8fCBzdGVwIDwgLTMpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybignSW52YWxpZCBhcmd1bWVudCBmb3Igcm90YXRlKCkgbWV0aG9kLiBJdCBzaG91bGQgb25lIG9mIHRoZSBpbnRlZ2VycyBmcm9tIC0zIHRvIDMuJylcclxuICAgICAgICAgIHN0ZXAgPSAxXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3JvdGF0ZUJ5U3RlcChzdGVwKVxyXG4gICAgICB9LFxyXG4gICAgICByb3RhdGVDQ1cgKCkge1xyXG4gICAgICAgIHRoaXMucm90YXRlRGVncmVlcygtOTApXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvdGF0ZUNXICgpIHtcclxuICAgICAgICB0aGlzLnJvdGF0ZURlZ3JlZXMoOTApXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvdGF0ZURlZ3JlZXMgKGRlZ3JlZXMpIHtcclxuICAgICAgICBpZiAoIWRlZ3JlZXMpIHJldHVyblxyXG5cclxuICAgICAgICB0aGlzLmN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC50cmFuc2xhdGUodGhpcy5jYW52YXMud2lkdGggLyAyLCB0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKSAvLyBtb3ZlIHRvIGNlbnRlclxyXG4gICAgICAgIHRoaXMuY3R4LnJvdGF0ZShkZWdyZWVzICogTWF0aC5QSSAvIDE4MClcclxuXHJcbiAgICAgICAgLy8gc3BlY2lhbCBkcmF3aW5nIGFmdGVyIHJvdGF0aW9uXHJcbiAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGFpbnRCYWNrZ3JvdW5kKClcclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1nLCAtdGhpcy5jYW52YXMud2lkdGggLyAyLCAtdGhpcy5jYW52YXMuaGVpZ2h0IC8gMiwgdGhpcy5jYW52YXMuaGVpZ2h0LCB0aGlzLmNhbnZhcy53aWR0aClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMucGFpbnRCYWNrZ3JvdW5kKClcclxuICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSh0aGlzLmltZywgLXRoaXMuY2FudmFzLndpZHRoIC8gMiwgLXRoaXMuY2FudmFzLmhlaWdodCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmN0eC50cmFuc2xhdGUoLSh0aGlzLmNhbnZhcy53aWR0aCAvIDIpLCAtKHRoaXMuY2FudmFzLmhlaWdodCAvIDIpKSAvLyBtb3ZlIHRvIHRvcCBsZWZ0IGNvcm5lclxyXG4gICAgICAgIHRoaXMuZHJhdygpXHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuUk9UQVRFX0VWRU5UKVxyXG4gICAgICB9LFxyXG4gICAgICBmbGlwWCAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVJvdGF0aW9uIHx8IHRoaXMuZGlzYWJsZWQpIHJldHVyblxyXG4gICAgICAgIHRoaXMuX3NldE9yaWVudGF0aW9uKDIpXHJcbiAgICAgIH0sXHJcbiAgICAgIGZsaXBZICgpIHtcclxuICAgICAgICBpZiAodGhpcy5kaXNhYmxlUm90YXRpb24gfHwgdGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24oNClcclxuICAgICAgfSxcclxuICAgICAgcmVmcmVzaCAoKSB7XHJcbiAgICAgICAgdGhpcy4kbmV4dFRpY2sodGhpcy5faW5pdClcclxuICAgICAgfSxcclxuICAgICAgaGFzSW1hZ2UgKCkge1xyXG4gICAgICAgIHJldHVybiAhIXRoaXMuaW1hZ2VTZXRcclxuICAgICAgfSxcclxuICAgICAgYXBwbHlNZXRhZGF0YSAobWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAoIW1ldGFkYXRhIHx8ICF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgIHRoaXMudXNlck1ldGFkYXRhID0gbWV0YWRhdGFcclxuICAgICAgICB2YXIgb3JpID0gbWV0YWRhdGEub3JpZW50YXRpb24gfHwgdGhpcy5vcmllbnRhdGlvbiB8fCAxXHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24ob3JpLCB0cnVlKVxyXG4gICAgICB9LFxyXG4gICAgICBnZW5lcmF0ZURhdGFVcmwgKHR5cGUsIGNvbXByZXNzaW9uUmF0ZSkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm4gJydcclxuICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMudG9EYXRhVVJMKHR5cGUsIGNvbXByZXNzaW9uUmF0ZSlcclxuICAgICAgfSxcclxuICAgICAgZ2VuZXJhdGVCbG9iIChjYWxsYmFjaywgbWltZVR5cGUsIHF1YWxpdHlBcmd1bWVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm4gbnVsbFxyXG4gICAgICAgIHRoaXMuY2FudmFzLnRvQmxvYihjYWxsYmFjaywgbWltZVR5cGUsIHF1YWxpdHlBcmd1bWVudClcclxuICAgICAgfSxcclxuICAgICAgcHJvbWlzZWRCbG9iICguLi5hcmdzKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBQcm9taXNlID09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ05vIFByb21pc2Ugc3VwcG9ydC4gUGxlYXNlIGFkZCBQcm9taXNlIHBvbHlmaWxsIGlmIHlvdSB3YW50IHRvIHVzZSB0aGlzIG1ldGhvZC4nKVxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aGlzLmdlbmVyYXRlQmxvYigoYmxvYikgPT4ge1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoYmxvYilcclxuICAgICAgICAgICAgfSwgYXJncylcclxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0sXHJcbiAgICAgIGdldE1ldGFkYXRhICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuIHt9XHJcbiAgICAgICAgbGV0IHsgc3RhcnRYLCBzdGFydFkgfSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGFydFgsXHJcbiAgICAgICAgICBzdGFydFksXHJcbiAgICAgICAgICBzY2FsZTogdGhpcy5zY2FsZVJhdGlvLFxyXG4gICAgICAgICAgb3JpZW50YXRpb246IHRoaXMub3JpZW50YXRpb25cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHN1cHBvcnREZXRlY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAnYmFzaWMnOiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICYmIHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYixcclxuICAgICAgICAgICdkbmQnOiAnb25kcmFnc3RhcnQnIGluIGRpdiAmJiAnb25kcm9wJyBpbiBkaXZcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGNob29zZUZpbGUgKCkge1xyXG4gICAgICAgIHRoaXMuJHJlZnMuZmlsZUlucHV0LmNsaWNrKClcclxuICAgICAgfSxcclxuICAgICAgcmVtb3ZlICgpIHtcclxuICAgICAgICBsZXQgY3R4ID0gdGhpcy5jdHhcclxuICAgICAgICB0aGlzLl9wYWludEJhY2tncm91bmQoKVxyXG4gICAgICAgIHRoaXMuX3NldEltYWdlUGxhY2Vob2xkZXIoKVxyXG4gICAgICAgIGN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJ1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJ1xyXG4gICAgICAgIGxldCBkZWZhdWx0Rm9udFNpemUgPSB0aGlzLm91dHB1dFdpZHRoICogREVGQVVMVF9QTEFDRUhPTERFUl9UQUtFVVAgLyB0aGlzLnBsYWNlaG9sZGVyLmxlbmd0aFxyXG4gICAgICAgIGxldCBmb250U2l6ZSA9ICghdGhpcy5jb21wdXRlZFBsYWNlaG9sZGVyRm9udFNpemUgfHwgdGhpcy5jb21wdXRlZFBsYWNlaG9sZGVyRm9udFNpemUgPT0gMCkgPyBkZWZhdWx0Rm9udFNpemUgOiB0aGlzLmNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZVxyXG4gICAgICAgIGN0eC5mb250ID0gZm9udFNpemUgKyAncHggc2Fucy1zZXJpZidcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gKCF0aGlzLnBsYWNlaG9sZGVyQ29sb3IgfHwgdGhpcy5wbGFjZWhvbGRlckNvbG9yID09ICdkZWZhdWx0JykgPyAnIzYwNjA2MCcgOiB0aGlzLnBsYWNlaG9sZGVyQ29sb3JcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5wbGFjZWhvbGRlciwgdGhpcy5vdXRwdXRXaWR0aCAvIDIsIHRoaXMub3V0cHV0SGVpZ2h0IC8gMilcclxuICAgICAgICBsZXQgaGFkSW1hZ2UgPSB0aGlzLmltZyAhPSBudWxsXHJcbiAgICAgICAgdGhpcy5vcmlnaW5hbEltYWdlID0gbnVsbFxyXG4gICAgICAgIHRoaXMuaW1nID0gbnVsbFxyXG4gICAgICAgIHRoaXMuJHJlZnMuZmlsZUlucHV0LnZhbHVlID0gJydcclxuICAgICAgICB0aGlzLmltZ0RhdGEgPSB7XHJcbiAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgIGhlaWdodDogMCxcclxuICAgICAgICAgIHN0YXJ0WDogMCxcclxuICAgICAgICAgIHN0YXJ0WTogMFxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gMVxyXG4gICAgICAgIHRoaXMuc2NhbGVSYXRpbyA9IG51bGxcclxuICAgICAgICB0aGlzLnVzZXJNZXRhZGF0YSA9IG51bGxcclxuICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICBpZiAoaGFkSW1hZ2UpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLklNQUdFX1JFTU9WRV9FVkVOVClcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9pbml0ICgpIHtcclxuICAgICAgICB0aGlzLmNhbnZhcyA9IHRoaXMuJHJlZnMuY2FudmFzXHJcbiAgICAgICAgdGhpcy5fc2V0U2l6ZSgpXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gKCF0aGlzLmNhbnZhc0NvbG9yIHx8IHRoaXMuY2FudmFzQ29sb3IgPT0gJ2RlZmF1bHQnKSA/ICd0cmFuc3BhcmVudCcgOiAodHlwZW9mIHRoaXMuY2FudmFzQ29sb3IgPT09ICdzdHJpbmcnID8gdGhpcy5jYW52YXNDb2xvciA6ICcnKVxyXG4gICAgICAgIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxyXG4gICAgICAgIHRoaXMub3JpZ2luYWxJbWFnZSA9IG51bGxcclxuICAgICAgICB0aGlzLmltZyA9IG51bGxcclxuICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICB0aGlzLl9zZXRJbml0aWFsKClcclxuICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUX0VWRU5ULCB0aGlzKVxyXG4gICAgICB9LFxyXG4gICAgICBfc2V0U2l6ZSAoKSB7XHJcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLm91dHB1dFdpZHRoXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggKyAncHgnXHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyAncHgnXHJcbiAgICAgIH0sXHJcbiAgICAgIF9yb3RhdGVCeVN0ZXAgKHN0ZXApIHtcclxuICAgICAgICBsZXQgb3JpZW50YXRpb24gPSAxXHJcbiAgICAgICAgc3dpdGNoIChzdGVwKSB7XHJcbiAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uID0gNlxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICBvcmllbnRhdGlvbiA9IDNcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgb3JpZW50YXRpb24gPSA4XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICBjYXNlIC0xOlxyXG4gICAgICAgICAgICBvcmllbnRhdGlvbiA9IDhcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIGNhc2UgLTI6XHJcbiAgICAgICAgICAgIG9yaWVudGF0aW9uID0gM1xyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgY2FzZSAtMzpcclxuICAgICAgICAgICAgb3JpZW50YXRpb24gPSA2XHJcbiAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3NldE9yaWVudGF0aW9uKG9yaWVudGF0aW9uKVxyXG4gICAgICB9LFxyXG4gICAgICBfc2V0SW1hZ2VQbGFjZWhvbGRlciAoKSB7XHJcbiAgICAgICAgbGV0IGltZ1xyXG4gICAgICAgIGlmICh0aGlzLiRzbG90cy5wbGFjZWhvbGRlciAmJiB0aGlzLiRzbG90cy5wbGFjZWhvbGRlclswXSkge1xyXG4gICAgICAgICAgbGV0IHZOb2RlID0gdGhpcy4kc2xvdHMucGxhY2Vob2xkZXJbMF1cclxuICAgICAgICAgIGxldCB7IHRhZywgZWxtIH0gPSB2Tm9kZVxyXG4gICAgICAgICAgaWYgKHRhZyA9PSAnaW1nJyAmJiBlbG0pIHtcclxuICAgICAgICAgICAgaW1nID0gZWxtXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghaW1nKSByZXR1cm5cclxuICAgICAgICB2YXIgb25Mb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKGltZywgMCwgMCwgdGhpcy5vdXRwdXRXaWR0aCwgdGhpcy5vdXRwdXRIZWlnaHQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1LmltYWdlTG9hZGVkKGltZykpIHtcclxuICAgICAgICAgIG9uTG9hZCgpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGltZy5vbmxvYWQgPSBvbkxvYWRcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9zZXRJbml0aWFsICgpIHtcclxuICAgICAgICBsZXQgc3JjLCBpbWdcclxuICAgICAgICBpZiAodGhpcy4kc2xvdHMuaW5pdGlhbCAmJiB0aGlzLiRzbG90cy5pbml0aWFsWzBdKSB7XHJcbiAgICAgICAgICBsZXQgdk5vZGUgPSB0aGlzLiRzbG90cy5pbml0aWFsWzBdXHJcbiAgICAgICAgICBsZXQgeyB0YWcsIGVsbSB9ID0gdk5vZGVcclxuICAgICAgICAgIGlmICh0YWcgPT0gJ2ltZycgJiYgZWxtKSB7XHJcbiAgICAgICAgICAgIGltZyA9IGVsbVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5pbml0aWFsSW1hZ2UgJiYgdHlwZW9mIHRoaXMuaW5pdGlhbEltYWdlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgc3JjID0gdGhpcy5pbml0aWFsSW1hZ2VcclxuICAgICAgICAgIGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICBpZiAoIS9eZGF0YTovLnRlc3Qoc3JjKSAmJiAhL15ibG9iOi8udGVzdChzcmMpKSB7XHJcbiAgICAgICAgICAgIGltZy5zZXRBdHRyaWJ1dGUoJ2Nyb3NzT3JpZ2luJywgJ2Fub255bW91cycpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpbWcuc3JjID0gc3JjXHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsSW1hZ2UgPT09ICdvYmplY3QnICYmIHRoaXMuaW5pdGlhbEltYWdlIGluc3RhbmNlb2YgSW1hZ2UpIHtcclxuICAgICAgICAgIGltZyA9IHRoaXMuaW5pdGlhbEltYWdlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghc3JjICYmICFpbWcpIHtcclxuICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodS5pbWFnZUxvYWRlZChpbWcpKSB7XHJcbiAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVClcclxuICAgICAgICAgIHRoaXMuX29ubG9hZChpbWcsICtpbWcuZGF0YXNldFsnZXhpZk9yaWVudGF0aW9uJ10pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLklOSVRJQUxfSU1BR0VfTE9BREVEX0VWRU5UKVxyXG4gICAgICAgICAgICB0aGlzLl9vbmxvYWQoaW1nLCAraW1nLmRhdGFzZXRbJ2V4aWZPcmllbnRhdGlvbiddKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaW1nLm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9vbmxvYWQgKGltZywgb3JpZW50YXRpb24gPSAxKSB7XHJcbiAgICAgICAgdGhpcy5vcmlnaW5hbEltYWdlID0gaW1nXHJcbiAgICAgICAgdGhpcy5pbWcgPSBpbWdcclxuICAgICAgICBpZiAoaXNOYU4ob3JpZW50YXRpb24pKSB7XHJcbiAgICAgICAgICBvcmllbnRhdGlvbiA9IDFcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fc2V0T3JpZW50YXRpb24ob3JpZW50YXRpb24pXHJcbiAgICAgIH0sXHJcbiAgICAgIF9oYW5kbGVDbGljayAoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkgJiYgIXRoaXMuZGlzYWJsZUNsaWNrVG9DaG9vc2UgJiYgIXRoaXMuZGlzYWJsZWQgJiYgIXRoaXMuc3VwcG9ydFRvdWNoKSB7XHJcbiAgICAgICAgICB0aGlzLmNob29zZUZpbGUoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZUlucHV0Q2hhbmdlICgpIHtcclxuICAgICAgICBsZXQgaW5wdXQgPSB0aGlzLiRyZWZzLmZpbGVJbnB1dFxyXG4gICAgICAgIGlmICghaW5wdXQuZmlsZXMubGVuZ3RoKSByZXR1cm5cclxuICAgICAgICBsZXQgZmlsZSA9IGlucHV0LmZpbGVzWzBdXHJcbiAgICAgICAgdGhpcy5fb25OZXdGaWxlSW4oZmlsZSlcclxuICAgICAgfSxcclxuICAgICAgX29uTmV3RmlsZUluIChmaWxlKSB7XHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuRklMRV9DSE9PU0VfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgaWYgKCF0aGlzLl9maWxlU2l6ZUlzVmFsaWQoZmlsZSkpIHtcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLkZJTEVfU0laRV9FWENFRURfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgc2l6ZSBleGNlZWRzIGxpbWl0IHdoaWNoIGlzICcgKyB0aGlzLmZpbGVTaXplTGltaXQgKyAnIGJ5dGVzLicpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5fZmlsZVR5cGVJc1ZhbGlkKGZpbGUpKSB7XHJcbiAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5GSUxFX1RZUEVfTUlTTUFUQ0hfRVZFTlQsIGZpbGUpXHJcbiAgICAgICAgICBsZXQgdHlwZSA9IGZpbGUudHlwZSB8fCBmaWxlLm5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpLnBvcCgpXHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgdHlwZSAoJHt0eXBlfSkgZG9lcyBub3QgbWF0Y2ggd2hhdCB5b3Ugc3BlY2lmaWVkICgke3RoaXMuYWNjZXB0fSkuYClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cuRmlsZVJlYWRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgIGxldCBmciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgICAgICAgIGZyLm9ubG9hZCA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBmaWxlRGF0YSA9IGUudGFyZ2V0LnJlc3VsdFxyXG4gICAgICAgICAgICBsZXQgb3JpZW50YXRpb24gPSAxXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSB1LmdldEZpbGVPcmllbnRhdGlvbih1LmJhc2U2NFRvQXJyYXlCdWZmZXIoZmlsZURhdGEpKVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHsgfVxyXG4gICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPCAxKSBvcmllbnRhdGlvbiA9IDFcclxuICAgICAgICAgICAgbGV0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICAgIGltZy5zcmMgPSBmaWxlRGF0YVxyXG4gICAgICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgIHRoaXMuX29ubG9hZChpbWcsIG9yaWVudGF0aW9uKVxyXG4gICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk5FV19JTUFHRSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZnIucmVhZEFzRGF0YVVSTChmaWxlKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2ZpbGVTaXplSXNWYWxpZCAoZmlsZSkge1xyXG4gICAgICAgIGlmICghZmlsZSkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVTaXplTGltaXQgfHwgdGhpcy5maWxlU2l6ZUxpbWl0ID09IDApIHJldHVybiB0cnVlXHJcbiAgICAgICAgcmV0dXJuIGZpbGUuc2l6ZSA8IHRoaXMuZmlsZVNpemVMaW1pdFxyXG4gICAgICB9LFxyXG4gICAgICBfZmlsZVR5cGVJc1ZhbGlkIChmaWxlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFjY2VwY3QpIHJldHVybiB0cnVlXHJcbiAgICAgICAgbGV0IGFjY2VwdCA9IHRoaXMuYWNjZXB0XHJcbiAgICAgICAgbGV0IGJhc2VNaW1ldHlwZSA9IGFjY2VwdC5yZXBsYWNlKC9cXC8uKiQvLCAnJylcclxuICAgICAgICBsZXQgdHlwZXMgPSBhY2NlcHQuc3BsaXQoJywnKVxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0eXBlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgbGV0IHR5cGUgPSB0eXBlc1tpXVxyXG4gICAgICAgICAgbGV0IHQgPSB0eXBlLnRyaW0oKVxyXG4gICAgICAgICAgaWYgKHQuY2hhckF0KDApID09ICcuJykge1xyXG4gICAgICAgICAgICBpZiAoZmlsZS5uYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKS5wb3AoKSA9PT0gdC50b0xvd2VyQ2FzZSgpLnNsaWNlKDEpKSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgfSBlbHNlIGlmICgvXFwvXFwqJC8udGVzdCh0KSkge1xyXG4gICAgICAgICAgICB2YXIgZmlsZUJhc2VUeXBlID0gZmlsZS50eXBlLnJlcGxhY2UoL1xcLy4qJC8sICcnKVxyXG4gICAgICAgICAgICBpZiAoZmlsZUJhc2VUeXBlID09PSBiYXNlTWltZXR5cGUpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpbGUudHlwZSA9PT0gdHlwZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgfSxcclxuICAgICAgX3BsYWNlSW1hZ2UgKGFwcGx5TWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaW1nKSByZXR1cm5cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHRoaXMubmF0dXJhbFdpZHRoID0gdGhpcy5pbWcubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgdGhpcy5uYXR1cmFsSGVpZ2h0ID0gdGhpcy5pbWcubmF0dXJhbEhlaWdodFxyXG4gICAgICAgIGltZ0RhdGEuc3RhcnRYID0gdS5udW1iZXJWYWxpZChpbWdEYXRhLnN0YXJ0WCkgPyBpbWdEYXRhLnN0YXJ0WCA6IDBcclxuICAgICAgICBpbWdEYXRhLnN0YXJ0WSA9IHUubnVtYmVyVmFsaWQoaW1nRGF0YS5zdGFydFkpID8gaW1nRGF0YS5zdGFydFkgOiAwXHJcbiAgICAgICAgaWYgKHRoaXMucHJldmVudFdoaXRlU3BhY2UpIHtcclxuICAgICAgICAgIHRoaXMuX2FzcGVjdEZpbGwoKVxyXG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaW1hZ2VTZXQpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmluaXRpYWxTaXplID09ICdjb250YWluJykge1xyXG4gICAgICAgICAgICB0aGlzLl9hc3BlY3RGaXQoKVxyXG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmluaXRpYWxTaXplID09ICduYXR1cmFsJykge1xyXG4gICAgICAgICAgICB0aGlzLl9uYXR1cmFsU2l6ZSgpXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9hc3BlY3RGaWxsKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gdGhpcy5uYXR1cmFsV2lkdGggKiB0aGlzLnNjYWxlUmF0aW9cclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSB0aGlzLm5hdHVyYWxIZWlnaHQgKiB0aGlzLnNjYWxlUmF0aW9cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCF0aGlzLmltYWdlU2V0KSB7XHJcbiAgICAgICAgICBpZiAoL3RvcC8udGVzdCh0aGlzLmluaXRpYWxQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgaW1nRGF0YS5zdGFydFkgPSAwXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKC9ib3R0b20vLnRlc3QodGhpcy5pbml0aWFsUG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuc3RhcnRZID0gdGhpcy5vdXRwdXRIZWlnaHQgLSBpbWdEYXRhLmhlaWdodFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKC9sZWZ0Ly50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICAgIH0gZWxzZSBpZiAoL3JpZ2h0Ly50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHRoaXMub3V0cHV0V2lkdGggLSBpbWdEYXRhLndpZHRoXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoL14tP1xcZCslIC0/XFxkKyUkLy50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gL14oLT9cXGQrKSUgKC0/XFxkKyklJC8uZXhlYyh0aGlzLmluaXRpYWxQb3NpdGlvbilcclxuICAgICAgICAgICAgdmFyIHggPSArcmVzdWx0WzFdIC8gMTAwXHJcbiAgICAgICAgICAgIHZhciB5ID0gK3Jlc3VsdFsyXSAvIDEwMFxyXG4gICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHggKiAodGhpcy5vdXRwdXRXaWR0aCAtIGltZ0RhdGEud2lkdGgpXHJcbiAgICAgICAgICAgIGltZ0RhdGEuc3RhcnRZID0geSAqICh0aGlzLm91dHB1dEhlaWdodCAtIGltZ0RhdGEuaGVpZ2h0KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBhcHBseU1ldGFkYXRhICYmIHRoaXMuX2FwcGx5TWV0YWRhdGEoKVxyXG4gICAgICAgIGlmIChhcHBseU1ldGFkYXRhICYmIHRoaXMucHJldmVudFdoaXRlU3BhY2UpIHtcclxuICAgICAgICAgIHRoaXMuem9vbShmYWxzZSwgMClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5tb3ZlKHsgeDogMCwgeTogMCB9KVxyXG4gICAgICAgICAgdGhpcy5fZHJhdygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBfYXNwZWN0RmlsbCAoKSB7XHJcbiAgICAgICAgbGV0IGltZ1dpZHRoID0gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICBsZXQgaW1nSGVpZ2h0ID0gdGhpcy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgbGV0IGNhbnZhc1JhdGlvID0gdGhpcy5vdXRwdXRXaWR0aCAvIHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgbGV0IHNjYWxlUmF0aW9cclxuICAgICAgICBpZiAodGhpcy5hc3BlY3RSYXRpbyA+IGNhbnZhc1JhdGlvKSB7XHJcbiAgICAgICAgICBzY2FsZVJhdGlvID0gaW1nSGVpZ2h0IC8gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IGltZ1dpZHRoIC8gc2NhbGVSYXRpb1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gLSh0aGlzLmltZ0RhdGEud2lkdGggLSB0aGlzLm91dHB1dFdpZHRoKSAvIDJcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSAwXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNjYWxlUmF0aW8gPSBpbWdXaWR0aCAvIHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSBpbWdIZWlnaHQgLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSB0aGlzLm91dHB1dFdpZHRoXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9hc3BlY3RGaXQgKCkge1xyXG4gICAgICAgIGxldCBpbWdXaWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgbGV0IGltZ0hlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodFxyXG4gICAgICAgIGxldCBjYW52YXNSYXRpbyA9IHRoaXMub3V0cHV0V2lkdGggLyB0aGlzLm91dHB1dEhlaWdodFxyXG4gICAgICAgIGxldCBzY2FsZVJhdGlvXHJcbiAgICAgICAgaWYgKHRoaXMuYXNwZWN0UmF0aW8gPiBjYW52YXNSYXRpbykge1xyXG4gICAgICAgICAgc2NhbGVSYXRpbyA9IGltZ1dpZHRoIC8gdGhpcy5vdXRwdXRXaWR0aFxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IGltZ0hlaWdodCAvIHNjYWxlUmF0aW9cclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSAtKHRoaXMuaW1nRGF0YS5oZWlnaHQgLSB0aGlzLm91dHB1dEhlaWdodCkgLyAyXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNjYWxlUmF0aW8gPSBpbWdIZWlnaHQgLyB0aGlzLm91dHB1dEhlaWdodFxyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gaW1nV2lkdGggLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuaGVpZ2h0ID0gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFggPSAtKHRoaXMuaW1nRGF0YS53aWR0aCAtIHRoaXMub3V0cHV0V2lkdGgpIC8gMlxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX25hdHVyYWxTaXplICgpIHtcclxuICAgICAgICBsZXQgaW1nV2lkdGggPSB0aGlzLm5hdHVyYWxXaWR0aFxyXG4gICAgICAgIGxldCBpbWdIZWlnaHQgPSB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSBpbWdXaWR0aFxyXG4gICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSBpbWdIZWlnaHRcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gLSh0aGlzLmltZ0RhdGEud2lkdGggLSB0aGlzLm91dHB1dFdpZHRoKSAvIDJcclxuICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlUG9pbnRlclN0YXJ0IChldnQpIHtcclxuICAgICAgICB0aGlzLnN1cHBvcnRUb3VjaCA9IHRydWVcclxuICAgICAgICB0aGlzLnBvaW50ZXJNb3ZlZCA9IGZhbHNlXHJcbiAgICAgICAgbGV0IHBvaW50ZXJDb29yZCA9IHUuZ2V0UG9pbnRlckNvb3JkcyhldnQsIHRoaXMpXHJcbiAgICAgICAgdGhpcy5wb2ludGVyU3RhcnRDb29yZCA9IHBvaW50ZXJDb29yZFxyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkKSByZXR1cm5cclxuICAgICAgICAvLyBzaW11bGF0ZSBjbGljayB3aXRoIHRvdWNoIG9uIG1vYmlsZSBkZXZpY2VzXHJcbiAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkgJiYgIXRoaXMuZGlzYWJsZUNsaWNrVG9DaG9vc2UpIHtcclxuICAgICAgICAgIHRoaXMudGFiU3RhcnQgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKVxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGlnbm9yZSBtb3VzZSByaWdodCBjbGljayBhbmQgbWlkZGxlIGNsaWNrXHJcbiAgICAgICAgaWYgKGV2dC53aGljaCAmJiBldnQud2hpY2ggPiAxKSByZXR1cm5cclxuICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgdGhpcy5kcmFnZ2luZyA9IHRydWVcclxuICAgICAgICAgIHRoaXMucGluY2hpbmcgPSBmYWxzZVxyXG4gICAgICAgICAgbGV0IGNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gY29vcmRcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV2dC50b3VjaGVzICYmIGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMiAmJiAhdGhpcy5kaXNhYmxlUGluY2hUb1pvb20pIHtcclxuICAgICAgICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZVxyXG4gICAgICAgICAgdGhpcy5waW5jaGluZyA9IHRydWVcclxuICAgICAgICAgIHRoaXMucGluY2hEaXN0YW5jZSA9IHUuZ2V0UGluY2hEaXN0YW5jZShldnQsIHRoaXMpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjYW5jZWxFdmVudHMgPSBbJ21vdXNldXAnLCAndG91Y2hlbmQnLCAndG91Y2hjYW5jZWwnLCAncG9pbnRlcmVuZCcsICdwb2ludGVyY2FuY2VsJ11cclxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gY2FuY2VsRXZlbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICBsZXQgZSA9IGNhbmNlbEV2ZW50c1tpXVxyXG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihlLCB0aGlzLl9oYW5kbGVQb2ludGVyRW5kKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZVBvaW50ZXJFbmQgKGV2dCkge1xyXG4gICAgICAgIGxldCBwb2ludGVyTW92ZURpc3RhbmNlID0gMFxyXG4gICAgICAgIGlmICh0aGlzLnBvaW50ZXJTdGFydENvb3JkKSB7XHJcbiAgICAgICAgICBsZXQgcG9pbnRlckNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgIHBvaW50ZXJNb3ZlRGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3cocG9pbnRlckNvb3JkLnggLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLngsIDIpICsgTWF0aC5wb3cocG9pbnRlckNvb3JkLnkgLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLnksIDIpKSB8fCAwXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkKSByZXR1cm5cclxuICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSAmJiAhdGhpcy5kaXNhYmxlQ2xpY2tUb0Nob29zZSkge1xyXG4gICAgICAgICAgbGV0IHRhYkVuZCA9IG5ldyBEYXRlKCkudmFsdWVPZigpXHJcbiAgICAgICAgICBpZiAoKHBvaW50ZXJNb3ZlRGlzdGFuY2UgPCBDTElDS19NT1ZFX1RIUkVTSE9MRCkgJiYgdGFiRW5kIC0gdGhpcy50YWJTdGFydCA8IE1JTl9NU19QRVJfQ0xJQ0sgJiYgdGhpcy5zdXBwb3J0VG91Y2gpIHtcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2VGaWxlKClcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMudGFiU3RhcnQgPSAwXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5waW5jaGluZyA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5waW5jaERpc3RhbmNlID0gMFxyXG4gICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gbnVsbFxyXG4gICAgICAgIHRoaXMucG9pbnRlck1vdmVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLnBvaW50ZXJTdGFydENvb3JkID0gbnVsbFxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlUG9pbnRlck1vdmUgKGV2dCkge1xyXG4gICAgICAgIHRoaXMucG9pbnRlck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSByZXR1cm5cclxuICAgICAgICBsZXQgY29vcmQgPSB1LmdldFBvaW50ZXJDb29yZHMoZXZ0LCB0aGlzKVxyXG4gICAgICAgIHRoaXMuY3VycmVudFBvaW50ZXJDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlRHJhZ1RvTW92ZSkgcmV0dXJuXHJcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nKSByZXR1cm5cclxuICAgICAgICAgIGlmICh0aGlzLmxhc3RNb3ZpbmdDb29yZCkge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUoe1xyXG4gICAgICAgICAgICAgIHg6IGNvb3JkLnggLSB0aGlzLmxhc3RNb3ZpbmdDb29yZC54LFxyXG4gICAgICAgICAgICAgIHk6IGNvb3JkLnkgLSB0aGlzLmxhc3RNb3ZpbmdDb29yZC55XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB0aGlzLmxhc3RNb3ZpbmdDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChldnQudG91Y2hlcyAmJiBldnQudG91Y2hlcy5sZW5ndGggPT09IDIgJiYgIXRoaXMuZGlzYWJsZVBpbmNoVG9ab29tKSB7XHJcbiAgICAgICAgICBpZiAoIXRoaXMucGluY2hpbmcpIHJldHVyblxyXG4gICAgICAgICAgbGV0IGRpc3RhbmNlID0gdS5nZXRQaW5jaERpc3RhbmNlKGV2dCwgdGhpcylcclxuICAgICAgICAgIGxldCBkZWx0YSA9IGRpc3RhbmNlIC0gdGhpcy5waW5jaERpc3RhbmNlXHJcbiAgICAgICAgICB0aGlzLnpvb20oZGVsdGEgPiAwLCBQSU5DSF9BQ0NFTEVSQVRJT04pXHJcbiAgICAgICAgICB0aGlzLnBpbmNoRGlzdGFuY2UgPSBkaXN0YW5jZVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZVBvaW50ZXJMZWF2ZSAoKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UG9pbnRlckNvb3JkID0gbnVsbFxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlV2hlZWwgKGV2dCkge1xyXG4gICAgICAgIGlmICh0aGlzLmRpc2FibGVkIHx8IHRoaXMuZGlzYWJsZVNjcm9sbFRvWm9vbSB8fCAhdGhpcy5oYXNJbWFnZSgpKSByZXR1cm5cclxuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgIHRoaXMuc2Nyb2xsaW5nID0gdHJ1ZVxyXG4gICAgICAgIGlmIChldnQud2hlZWxEZWx0YSA8IDAgfHwgZXZ0LmRlbHRhWSA+IDAgfHwgZXZ0LmRldGFpbCA+IDApIHtcclxuICAgICAgICAgIHRoaXMuem9vbSh0aGlzLnJldmVyc2VTY3JvbGxUb1pvb20pXHJcbiAgICAgICAgfSBlbHNlIGlmIChldnQud2hlZWxEZWx0YSA+IDAgfHwgZXZ0LmRlbHRhWSA8IDAgfHwgZXZ0LmRldGFpbCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuem9vbSghdGhpcy5yZXZlcnNlU2Nyb2xsVG9ab29tKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRuZXh0VGljaygoKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnNjcm9sbGluZyA9IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZURyYWdFbnRlciAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlRHJhZ0FuZERyb3AgfHwgdGhpcy5oYXNJbWFnZSgpIHx8ICF1LmV2ZW50SGFzRmlsZShldnQpKSByZXR1cm5cclxuICAgICAgICB0aGlzLmZpbGVEcmFnZ2VkT3ZlciA9IHRydWVcclxuICAgICAgfSxcclxuICAgICAgX2hhbmRsZURyYWdMZWF2ZSAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVEcmFnZ2VkT3ZlciB8fCAhdS5ldmVudEhhc0ZpbGUoZXZ0KSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5maWxlRHJhZ2dlZE92ZXIgPSBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlRHJhZ092ZXIgKGV2dCkge1xyXG4gICAgICB9LFxyXG4gICAgICBfaGFuZGxlRHJvcCAoZXZ0KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVEcmFnZ2VkT3ZlciB8fCAhdS5ldmVudEhhc0ZpbGUoZXZ0KSkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5maWxlRHJhZ2dlZE92ZXIgPSBmYWxzZVxyXG4gICAgICAgIGxldCBmaWxlXHJcbiAgICAgICAgbGV0IGR0ID0gZXZ0LmRhdGFUcmFuc2ZlclxyXG4gICAgICAgIGlmICghZHQpIHJldHVyblxyXG4gICAgICAgIGlmIChkdC5pdGVtcykge1xyXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGR0Lml0ZW1zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtID0gZHQuaXRlbXNbaV1cclxuICAgICAgICAgICAgaWYgKGl0ZW0ua2luZCA9PSAnZmlsZScpIHtcclxuICAgICAgICAgICAgICBmaWxlID0gaXRlbS5nZXRBc0ZpbGUoKVxyXG4gICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZmlsZSA9IGR0LmZpbGVzWzBdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChmaWxlKSB7XHJcbiAgICAgICAgICB0aGlzLl9vbk5ld0ZpbGVJbihmaWxlKVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX3ByZXZlbnRNb3ZpbmdUb1doaXRlU3BhY2UgKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEuc3RhcnRYID4gMCkge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS5zdGFydFkgPiAwKSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gMFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5vdXRwdXRXaWR0aCAtIHRoaXMuaW1nRGF0YS5zdGFydFggPiB0aGlzLmltZ0RhdGEud2lkdGgpIHtcclxuICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFggPSAtKHRoaXMuaW1nRGF0YS53aWR0aCAtIHRoaXMub3V0cHV0V2lkdGgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLm91dHB1dEhlaWdodCAtIHRoaXMuaW1nRGF0YS5zdGFydFkgPiB0aGlzLmltZ0RhdGEuaGVpZ2h0KSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBfcHJldmVudFpvb21pbmdUb1doaXRlU3BhY2UgKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmltZ0RhdGEud2lkdGggPCB0aGlzLm91dHB1dFdpZHRoKSB7XHJcbiAgICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB0aGlzLm91dHB1dFdpZHRoIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS5oZWlnaHQgPCB0aGlzLm91dHB1dEhlaWdodCkge1xyXG4gICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdGhpcy5vdXRwdXRIZWlnaHQgLyB0aGlzLm5hdHVyYWxIZWlnaHRcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9zZXRPcmllbnRhdGlvbiAob3JpZW50YXRpb24gPSA2LCBhcHBseU1ldGFkYXRhKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgdmFyIHVzZU9yaWdpbmFsID0gYXBwbHlNZXRhZGF0YSAmJiB0aGlzLnVzZXJNZXRhZGF0YS5vcmllbnRhdGlvbiAhPT0gdGhpcy5vcmllbnRhdGlvblxyXG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA+IDEgfHwgdXNlT3JpZ2luYWwpIHtcclxuICAgICAgICAgIHZhciBfaW1nID0gdS5nZXRSb3RhdGVkSW1hZ2UodXNlT3JpZ2luYWwgPyB0aGlzLm9yaWdpbmFsSW1hZ2UgOiB0aGlzLmltZywgb3JpZW50YXRpb24pXHJcbiAgICAgICAgICBfaW1nLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pbWcgPSBfaW1nXHJcbiAgICAgICAgICAgIHRoaXMuX3BsYWNlSW1hZ2UoYXBwbHlNZXRhZGF0YSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZShhcHBseU1ldGFkYXRhKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAob3JpZW50YXRpb24gPT0gMikge1xyXG4gICAgICAgICAgLy8gZmxpcCB4XHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5mbGlwWCh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gNCkge1xyXG4gICAgICAgICAgLy8gZmxpcCB5XHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5mbGlwWSh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gNikge1xyXG4gICAgICAgICAgLy8gOTAgZGVnXHJcbiAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gMykge1xyXG4gICAgICAgICAgLy8gMTgwIGRlZ1xyXG4gICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IHUucm90YXRlOTAodS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKSlcclxuICAgICAgICB9IGVsc2UgaWYgKG9yaWVudGF0aW9uID09IDgpIHtcclxuICAgICAgICAgIC8vIDI3MCBkZWdcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSB1LnJvdGF0ZTkwKHUucm90YXRlOTAodS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKSkpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcmllbnRhdGlvblxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXNlT3JpZ2luYWwpIHtcclxuICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSBvcmllbnRhdGlvblxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgX3BhaW50QmFja2dyb3VuZCAoKSB7XHJcbiAgICAgICAgbGV0IGJhY2tncm91bmRDb2xvciA9ICghdGhpcy5jYW52YXNDb2xvciB8fCB0aGlzLmNhbnZhc0NvbG9yID09ICdkZWZhdWx0JykgPyAndHJhbnNwYXJlbnQnIDogdGhpcy5jYW52YXNDb2xvclxyXG4gICAgICAgIHRoaXMuY3R4LmZpbGxTdHlsZSA9IGJhY2tncm91bmRDb2xvclxyXG4gICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLm91dHB1dFdpZHRoLCB0aGlzLm91dHB1dEhlaWdodClcclxuICAgICAgICB0aGlzLmN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLm91dHB1dFdpZHRoLCB0aGlzLm91dHB1dEhlaWdodClcclxuICAgICAgfSxcclxuICAgICAgX2RyYXcgKCkge1xyXG4gICAgICAgIHRoaXMuJG5leHRUaWNrKCgpID0+IHtcclxuICAgICAgICAgIGlmICghdGhpcy5pbWcpIHJldHVyblxyXG4gICAgICAgICAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2RyYXdGcmFtZSlcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RyYXdGcmFtZSgpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfSxcclxuICAgICAgX2RyYXdGcmFtZSAoKSB7XHJcbiAgICAgICAgbGV0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgbGV0IHsgc3RhcnRYLCBzdGFydFksIHdpZHRoLCBoZWlnaHQgfSA9IHRoaXMuaW1nRGF0YVxyXG4gICAgICAgIHRoaXMuX3BhaW50QmFja2dyb3VuZCgpXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltZywgc3RhcnRYLCBzdGFydFksIHdpZHRoLCBoZWlnaHQpXHJcbiAgICAgICAgdGhpcy4kZW1pdChldmVudHMuRFJBVywgY3R4KVxyXG4gICAgICAgIGlmICghdGhpcy5pbWFnZVNldCkge1xyXG4gICAgICAgICAgdGhpcy5pbWFnZVNldCA9IHRydWVcclxuICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk5FV19JTUFHRV9EUkFXTilcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIF9hcHBseU1ldGFkYXRhICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMudXNlck1ldGFkYXRhKSByZXR1cm5cclxuICAgICAgICB2YXIgeyBzdGFydFgsIHN0YXJ0WSwgc2NhbGUgfSA9IHRoaXMudXNlck1ldGFkYXRhXHJcbiAgICAgICAgaWYgKHUubnVtYmVyVmFsaWQoc3RhcnRYKSkge1xyXG4gICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IHN0YXJ0WFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodS5udW1iZXJWYWxpZChzdGFydFkpKSB7XHJcbiAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gc3RhcnRZXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1Lm51bWJlclZhbGlkKHNjYWxlKSkge1xyXG4gICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gc2NhbGVcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kbmV4dFRpY2soKCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy51c2VyTWV0YWRhdGEgPSBudWxsXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuPC9zY3JpcHQ+XHJcblxyXG48c3R5bGUgbGFuZz1cInN0eWx1c1wiPlxyXG4gIC5jcm9wcGEtY29udGFpbmVyXHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2tcclxuICAgIGN1cnNvcjogcG9pbnRlclxyXG4gICAgdHJhbnNpdGlvbjogYWxsIC4zc1xyXG4gICAgcG9zaXRpb246IHJlbGF0aXZlXHJcbiAgICBmb250LXNpemU6IDBcclxuICAgIGFsaWduLXNlbGY6IGZsZXgtc3RhcnRcclxuICAgIGJhY2tncm91bmQtY29sb3I6ICNlNmU2ZTZcclxuICAgIGNhbnZhc1xyXG4gICAgICB0cmFuc2l0aW9uOiBhbGwgLjNzXHJcbiAgICAmOmhvdmVyXHJcbiAgICAgIG9wYWNpdHk6IC43XHJcbiAgICAmLmNyb3BwYS0tZHJvcHpvbmVcclxuICAgICAgYm94LXNoYWRvdzogaW5zZXQgMCAwIDEwcHggbGlnaHRuZXNzKGJsYWNrLCAyMCUpXHJcbiAgICAgIGNhbnZhc1xyXG4gICAgICAgIG9wYWNpdHk6IC41XHJcbiAgICAmLmNyb3BwYS0tZGlzYWJsZWQtY2NcclxuICAgICAgY3Vyc29yOiBkZWZhdWx0XHJcbiAgICAgICY6aG92ZXJcclxuICAgICAgICBvcGFjaXR5OiAxXHJcbiAgICAmLmNyb3BwYS0taGFzLXRhcmdldFxyXG4gICAgICBjdXJzb3I6IG1vdmVcclxuICAgICAgJjpob3ZlclxyXG4gICAgICAgIG9wYWNpdHk6IDFcclxuICAgICAgJi5jcm9wcGEtLWRpc2FibGVkLW16XHJcbiAgICAgICAgY3Vyc29yOiBkZWZhdWx0XHJcbiAgICAmLmNyb3BwYS0tZGlzYWJsZWRcclxuICAgICAgY3Vyc29yOiBub3QtYWxsb3dlZFxyXG4gICAgICAmOmhvdmVyXHJcbiAgICAgICAgb3BhY2l0eTogMVxyXG4gICAgc3ZnLmljb24tcmVtb3ZlXHJcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZVxyXG4gICAgICBiYWNrZ3JvdW5kOiB3aGl0ZVxyXG4gICAgICBib3JkZXItcmFkaXVzOiA1MCVcclxuICAgICAgZmlsdGVyOiBkcm9wLXNoYWRvdygtMnB4IDJweCAycHggcmdiYSgwLCAwLCAwLCAwLjcpKVxyXG4gICAgICB6LWluZGV4OiAxMFxyXG4gICAgICBjdXJzb3I6IHBvaW50ZXJcclxuICAgICAgYm9yZGVyOiAycHggc29saWQgd2hpdGVcclxuPC9zdHlsZT4iLCIvKlxub2JqZWN0LWFzc2lnblxuKGMpIFNpbmRyZSBTb3JodXNcbkBsaWNlbnNlIE1JVFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwiaW1wb3J0IGNvbXBvbmVudCBmcm9tICcuL2Nyb3BwZXIudnVlJ1xyXG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nXHJcblxyXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcclxuICBjb21wb25lbnROYW1lOiAnY3JvcHBhJ1xyXG59XHJcblxyXG5jb25zdCBWdWVDcm9wcGEgPSB7XHJcbiAgaW5zdGFsbDogZnVuY3Rpb24gKFZ1ZSwgb3B0aW9ucykge1xyXG4gICAgb3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpXHJcbiAgICBsZXQgdmVyc2lvbiA9IE51bWJlcihWdWUudmVyc2lvbi5zcGxpdCgnLicpWzBdKVxyXG4gICAgaWYgKHZlcnNpb24gPCAyKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdnVlLWNyb3BwYSBzdXBwb3J0cyB2dWUgdmVyc2lvbiAyLjAgYW5kIGFib3ZlLiBZb3UgYXJlIHVzaW5nIFZ1ZUAke3ZlcnNpb259LiBQbGVhc2UgdXBncmFkZSB0byB0aGUgbGF0ZXN0IHZlcnNpb24gb2YgVnVlLmApXHJcbiAgICB9XHJcbiAgICBsZXQgY29tcG9uZW50TmFtZSA9IG9wdGlvbnMuY29tcG9uZW50TmFtZSB8fCAnY3JvcHBhJ1xyXG5cclxuICAgIC8vIHJlZ2lzdHJhdGlvblxyXG4gICAgVnVlLmNvbXBvbmVudChjb21wb25lbnROYW1lLCBjb21wb25lbnQpXHJcbiAgfSxcclxuXHJcbiAgY29tcG9uZW50XHJcbn1cclxuZXhwb3J0IGRlZmF1bHQgVnVlQ3JvcHBhIl0sIm5hbWVzIjpbInBvaW50Iiwidm0iLCJjYW52YXMiLCJxdWFsaXR5IiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsImNsaWVudFgiLCJjbGllbnRZIiwibGVmdCIsInRvcCIsImV2dCIsInBvaW50ZXIiLCJ0b3VjaGVzIiwiY2hhbmdlZFRvdWNoZXMiLCJvbmVQb2ludENvb3JkIiwicG9pbnRlcjEiLCJwb2ludGVyMiIsImNvb3JkMSIsImNvb3JkMiIsIk1hdGgiLCJzcXJ0IiwicG93IiwieCIsInkiLCJpbWciLCJjb21wbGV0ZSIsIm5hdHVyYWxXaWR0aCIsImRvY3VtZW50Iiwid2luZG93IiwibGFzdFRpbWUiLCJ2ZW5kb3JzIiwibGVuZ3RoIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJjYWxsYmFjayIsImN1cnJUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJ0aW1lVG9DYWxsIiwibWF4IiwiaWQiLCJzZXRUaW1lb3V0IiwiYXJnIiwiaXNBcnJheSIsIk9iamVjdCIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsIkhUTUxDYW52YXNFbGVtZW50IiwiYmluU3RyIiwibGVuIiwiYXJyIiwidG9CbG9iIiwiZGVmaW5lUHJvcGVydHkiLCJ0eXBlIiwiYXRvYiIsInRvRGF0YVVSTCIsInNwbGl0IiwiVWludDhBcnJheSIsImkiLCJjaGFyQ29kZUF0IiwiQmxvYiIsImR0IiwiZGF0YVRyYW5zZmVyIiwib3JpZ2luYWxFdmVudCIsInR5cGVzIiwiYXJyYXlCdWZmZXIiLCJ2aWV3IiwiRGF0YVZpZXciLCJnZXRVaW50MTYiLCJieXRlTGVuZ3RoIiwib2Zmc2V0IiwibWFya2VyIiwiZ2V0VWludDMyIiwibGl0dGxlIiwidGFncyIsImJhc2U2NCIsInJlcGxhY2UiLCJiaW5hcnlTdHJpbmciLCJieXRlcyIsImJ1ZmZlciIsIm9yaWVudGF0aW9uIiwiX2NhbnZhcyIsIkNhbnZhc0V4aWZPcmllbnRhdGlvbiIsImRyYXdJbWFnZSIsIl9pbWciLCJJbWFnZSIsInNyYyIsIm9yaSIsIm1hcCIsIm4iLCJpc05hTiIsIk51bWJlciIsImlzSW50ZWdlciIsInZhbHVlIiwiaXNGaW5pdGUiLCJmbG9vciIsImluaXRpYWxJbWFnZVR5cGUiLCJTdHJpbmciLCJ2YWwiLCJCb29sZWFuIiwidmFsaWRzIiwiZXZlcnkiLCJpbmRleE9mIiwid29yZCIsInRlc3QiLCJQQ1RfUEVSX1pPT00iLCJNSU5fTVNfUEVSX0NMSUNLIiwiQ0xJQ0tfTU9WRV9USFJFU0hPTEQiLCJNSU5fV0lEVEgiLCJERUZBVUxUX1BMQUNFSE9MREVSX1RBS0VVUCIsIlBJTkNIX0FDQ0VMRVJBVElPTiIsInJlbmRlciIsImV2ZW50cyIsIklOSVRfRVZFTlQiLCJwcm9wcyIsIndpZHRoIiwiaGVpZ2h0IiwicGxhY2Vob2xkZXJGb250U2l6ZSIsIm5hdHVyYWxIZWlnaHQiLCJfaW5pdCIsInJBRlBvbHlmaWxsIiwidG9CbG9iUG9seWZpbGwiLCJzdXBwb3J0cyIsInN1cHBvcnREZXRlY3Rpb24iLCJiYXNpYyIsIndhcm4iLCJoYXNJbWFnZSIsInByZXZlbnRXaGl0ZVNwYWNlIiwiaW1hZ2VTZXQiLCJfc2V0U2l6ZSIsIl9wbGFjZUltYWdlIiwiX2RyYXciLCJvbGRWYWwiLCJ1IiwibnVtYmVyVmFsaWQiLCJwb3MiLCJjdXJyZW50UG9pbnRlckNvb3JkIiwiaW1nRGF0YSIsInN0YXJ0WCIsInN0YXJ0WSIsIl9wcmV2ZW50Wm9vbWluZ1RvV2hpdGVTcGFjZSIsInVzZXJNZXRhZGF0YSIsImxvZyIsIm9mZnNldFgiLCJvZmZzZXRZIiwic2NhbGVSYXRpbyIsImFicyIsIiRlbWl0IiwiWk9PTV9FVkVOVCIsImN0eCIsIiRyZWZzIiwiZmlsZUlucHV0IiwiZmlsZXMiLCJvbGRYIiwib2xkWSIsIl9wcmV2ZW50TW92aW5nVG9XaGl0ZVNwYWNlIiwiTU9WRV9FVkVOVCIsImFtb3VudCIsIm1vdmUiLCJ6b29tSW4iLCJhY2NlbGVyYXRpb24iLCJyZWFsU3BlZWQiLCJ6b29tU3BlZWQiLCJzcGVlZCIsIm91dHB1dFdpZHRoIiwiem9vbSIsInN0ZXAiLCJkaXNhYmxlUm90YXRpb24iLCJkaXNhYmxlZCIsInBhcnNlSW50IiwiX3JvdGF0ZUJ5U3RlcCIsInJvdGF0ZURlZ3JlZXMiLCJkZWdyZWVzIiwiY2xlYXJSZWN0IiwidHJhbnNsYXRlIiwicm90YXRlIiwiUEkiLCJwYWludEJhY2tncm91bmQiLCJkcmF3IiwiUk9UQVRFX0VWRU5UIiwiX3NldE9yaWVudGF0aW9uIiwiJG5leHRUaWNrIiwibWV0YWRhdGEiLCJjb21wcmVzc2lvblJhdGUiLCJtaW1lVHlwZSIsInF1YWxpdHlBcmd1bWVudCIsImFyZ3MiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImdlbmVyYXRlQmxvYiIsImJsb2IiLCJlcnIiLCJkaXYiLCJjcmVhdGVFbGVtZW50IiwiRmlsZSIsIkZpbGVSZWFkZXIiLCJGaWxlTGlzdCIsImNsaWNrIiwiX3BhaW50QmFja2dyb3VuZCIsIl9zZXRJbWFnZVBsYWNlaG9sZGVyIiwidGV4dEJhc2VsaW5lIiwidGV4dEFsaWduIiwiZGVmYXVsdEZvbnRTaXplIiwicGxhY2Vob2xkZXIiLCJmb250U2l6ZSIsImNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZSIsImZvbnQiLCJmaWxsU3R5bGUiLCJwbGFjZWhvbGRlckNvbG9yIiwiZmlsbFRleHQiLCJvdXRwdXRIZWlnaHQiLCJoYWRJbWFnZSIsIm9yaWdpbmFsSW1hZ2UiLCJJTUFHRV9SRU1PVkVfRVZFTlQiLCJzdHlsZSIsImJhY2tncm91bmRDb2xvciIsImNhbnZhc0NvbG9yIiwiZ2V0Q29udGV4dCIsIl9zZXRJbml0aWFsIiwiJHNsb3RzIiwidk5vZGUiLCJ0YWciLCJlbG0iLCJvbkxvYWQiLCJpbWFnZUxvYWRlZCIsIm9ubG9hZCIsImluaXRpYWwiLCJpbml0aWFsSW1hZ2UiLCJzZXRBdHRyaWJ1dGUiLCJiYWJlbEhlbHBlcnMudHlwZW9mIiwicmVtb3ZlIiwiSU5JVElBTF9JTUFHRV9MT0FERURfRVZFTlQiLCJfb25sb2FkIiwiZGF0YXNldCIsIm9uZXJyb3IiLCJkaXNhYmxlQ2xpY2tUb0Nob29zZSIsInN1cHBvcnRUb3VjaCIsImNob29zZUZpbGUiLCJpbnB1dCIsImZpbGUiLCJfb25OZXdGaWxlSW4iLCJGSUxFX0NIT09TRV9FVkVOVCIsIl9maWxlU2l6ZUlzVmFsaWQiLCJGSUxFX1NJWkVfRVhDRUVEX0VWRU5UIiwiRXJyb3IiLCJmaWxlU2l6ZUxpbWl0IiwiX2ZpbGVUeXBlSXNWYWxpZCIsIkZJTEVfVFlQRV9NSVNNQVRDSF9FVkVOVCIsIm5hbWUiLCJ0b0xvd2VyQ2FzZSIsInBvcCIsImFjY2VwdCIsImZyIiwiZSIsImZpbGVEYXRhIiwidGFyZ2V0IiwicmVzdWx0IiwiZ2V0RmlsZU9yaWVudGF0aW9uIiwiYmFzZTY0VG9BcnJheUJ1ZmZlciIsIk5FV19JTUFHRSIsInJlYWRBc0RhdGFVUkwiLCJzaXplIiwiYWNjZXBjdCIsImJhc2VNaW1ldHlwZSIsInQiLCJ0cmltIiwiY2hhckF0Iiwic2xpY2UiLCJmaWxlQmFzZVR5cGUiLCJhcHBseU1ldGFkYXRhIiwiX2FzcGVjdEZpbGwiLCJpbml0aWFsU2l6ZSIsIl9hc3BlY3RGaXQiLCJfbmF0dXJhbFNpemUiLCJpbml0aWFsUG9zaXRpb24iLCJleGVjIiwiX2FwcGx5TWV0YWRhdGEiLCJpbWdXaWR0aCIsImltZ0hlaWdodCIsImNhbnZhc1JhdGlvIiwiYXNwZWN0UmF0aW8iLCJwb2ludGVyTW92ZWQiLCJwb2ludGVyQ29vcmQiLCJnZXRQb2ludGVyQ29vcmRzIiwicG9pbnRlclN0YXJ0Q29vcmQiLCJ0YWJTdGFydCIsInZhbHVlT2YiLCJ3aGljaCIsImRyYWdnaW5nIiwicGluY2hpbmciLCJjb29yZCIsImxhc3RNb3ZpbmdDb29yZCIsImRpc2FibGVQaW5jaFRvWm9vbSIsInBpbmNoRGlzdGFuY2UiLCJnZXRQaW5jaERpc3RhbmNlIiwiY2FuY2VsRXZlbnRzIiwiYWRkRXZlbnRMaXN0ZW5lciIsIl9oYW5kbGVQb2ludGVyRW5kIiwicG9pbnRlck1vdmVEaXN0YW5jZSIsInRhYkVuZCIsImRpc2FibGVEcmFnVG9Nb3ZlIiwicHJldmVudERlZmF1bHQiLCJkaXN0YW5jZSIsImRlbHRhIiwiZGlzYWJsZVNjcm9sbFRvWm9vbSIsInNjcm9sbGluZyIsIndoZWVsRGVsdGEiLCJkZWx0YVkiLCJkZXRhaWwiLCJyZXZlcnNlU2Nyb2xsVG9ab29tIiwiZGlzYWJsZURyYWdBbmREcm9wIiwiZXZlbnRIYXNGaWxlIiwiZmlsZURyYWdnZWRPdmVyIiwiaXRlbXMiLCJpdGVtIiwia2luZCIsImdldEFzRmlsZSIsInVzZU9yaWdpbmFsIiwiZ2V0Um90YXRlZEltYWdlIiwiZmxpcFgiLCJmbGlwWSIsInJvdGF0ZTkwIiwiZmlsbFJlY3QiLCJfZHJhd0ZyYW1lIiwiRFJBVyIsIk5FV19JTUFHRV9EUkFXTiIsInNjYWxlIiwiZGVmYXVsdE9wdGlvbnMiLCJWdWVDcm9wcGEiLCJWdWUiLCJvcHRpb25zIiwiYXNzaWduIiwidmVyc2lvbiIsImNvbXBvbmVudE5hbWUiLCJjb21wb25lbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxRQUFlO2VBQUEseUJBQ0VBLEtBREYsRUFDU0MsRUFEVCxFQUNhO1FBQ2xCQyxNQURrQixHQUNFRCxFQURGLENBQ2xCQyxNQURrQjtRQUNWQyxPQURVLEdBQ0VGLEVBREYsQ0FDVkUsT0FEVTs7UUFFcEJDLE9BQU9GLE9BQU9HLHFCQUFQLEVBQVg7UUFDSUMsVUFBVU4sTUFBTU0sT0FBcEI7UUFDSUMsVUFBVVAsTUFBTU8sT0FBcEI7V0FDTztTQUNGLENBQUNELFVBQVVGLEtBQUtJLElBQWhCLElBQXdCTCxPQUR0QjtTQUVGLENBQUNJLFVBQVVILEtBQUtLLEdBQWhCLElBQXVCTjtLQUY1QjtHQU5XO2tCQUFBLDRCQVlLTyxHQVpMLEVBWVVULEVBWlYsRUFZYztRQUNyQlUsZ0JBQUo7UUFDSUQsSUFBSUUsT0FBSixJQUFlRixJQUFJRSxPQUFKLENBQVksQ0FBWixDQUFuQixFQUFtQztnQkFDdkJGLElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQVY7S0FERixNQUVPLElBQUlGLElBQUlHLGNBQUosSUFBc0JILElBQUlHLGNBQUosQ0FBbUIsQ0FBbkIsQ0FBMUIsRUFBaUQ7Z0JBQzVD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
