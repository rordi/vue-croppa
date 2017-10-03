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

var _this = undefined;

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
            _this.rotateDegrees(-90);
        },
        rotateCW: function rotateCW() {
            _this.rotateDegrees(90);
        },
        rotateDegrees: function rotateDegrees(degrees) {
            var _this2 = this;

            if (!degrees) return;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // move to center
            this.ctx.rotate(degrees * Math.PI / 180);

            // special drawing after rotation
            if (!this.img) return;
            if (window.requestAnimationFrame) {
                requestAnimationFrame(function () {
                    _this2.paintBackground();
                    _this2.ctx.drawImage(_this2.img, -_this2.canvas.width / 2, -_this2.canvas.height / 2, _this2.canvas.height, _this2.canvas.width);
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
            var _this3 = this;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            if (typeof Promise == 'undefined') {
                console.warn('No Promise support. Please add Promise polyfill if you want to use this method.');
                return;
            }
            return new Promise(function (resolve, reject) {
                try {
                    _this3.generateBlob(function (blob) {
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
            var _this4 = this;

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
                _this4.ctx.drawImage(img, 0, 0, _this4.outputWidth, _this4.outputHeight);
            };
            if (u.imageLoaded(img)) {
                onLoad();
            } else {
                img.onload = onLoad;
            }
        },
        _setInitial: function _setInitial() {
            var _this5 = this;

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
                    _this5.$emit(events.INITIAL_IMAGE_LOADED_EVENT);
                    _this5._onload(img, +img.dataset['exifOrientation']);
                };
                img.onerror = function () {
                    _this5.remove();
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
            var _this6 = this;

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
                        _this6._onload(img, orientation);
                        _this6.$emit(events.NEW_IMAGE);
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
            var _this7 = this;

            if (this.disabled || this.disableScrollToZoom || !this.hasImage()) return;
            evt.preventDefault();
            this.scrolling = true;
            if (evt.wheelDelta < 0 || evt.deltaY > 0 || evt.detail > 0) {
                this.zoom(this.reverseScrollToZoom);
            } else if (evt.wheelDelta > 0 || evt.deltaY < 0 || evt.detail < 0) {
                this.zoom(!this.reverseScrollToZoom);
            }
            this.$nextTick(function () {
                _this7.scrolling = false;
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
            var _this8 = this;

            var orientation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 6;
            var applyMetadata = arguments[1];

            if (!this.img) return;
            var useOriginal = applyMetadata && this.userMetadata.orientation !== this.orientation;
            if (orientation > 1 || useOriginal) {
                var _img = u.getRotatedImage(useOriginal ? this.originalImage : this.img, orientation);
                _img.onload = function () {
                    _this8.img = _img;
                    _this8._placeImage(applyMetadata);
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
            var _this9 = this;

            this.$nextTick(function () {
                if (!_this9.img) return;
                if (window.requestAnimationFrame) {
                    requestAnimationFrame(_this9._drawFrame);
                } else {
                    _this9._drawFrame();
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
            var _this10 = this;

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
                _this10.userMetadata = null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLWNyb3BwYS5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3V0aWwuanMiLCIuLi8uLi8uLi9zcmMvcHJvcHMuanMiLCIuLi8uLi8uLi9zcmMvZXZlbnRzLmpzIiwiLi4vLi4vLi4vc3JjL2Nyb3BwZXIudnVlIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ2FudmFzRXhpZk9yaWVudGF0aW9uIGZyb20gJ2NhbnZhcy1leGlmLW9yaWVudGF0aW9uJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gIG9uZVBvaW50Q29vcmQgKHBvaW50LCB2bSkge1xyXG4gICAgbGV0IHsgY2FudmFzLCBxdWFsaXR5IH0gPSB2bVxyXG4gICAgbGV0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgIGxldCBjbGllbnRYID0gcG9pbnQuY2xpZW50WFxyXG4gICAgbGV0IGNsaWVudFkgPSBwb2ludC5jbGllbnRZXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiAoY2xpZW50WCAtIHJlY3QubGVmdCkgKiBxdWFsaXR5LFxyXG4gICAgICB5OiAoY2xpZW50WSAtIHJlY3QudG9wKSAqIHF1YWxpdHlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBnZXRQb2ludGVyQ29vcmRzIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlclxyXG4gICAgaWYgKGV2dC50b3VjaGVzICYmIGV2dC50b3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQudG91Y2hlc1swXVxyXG4gICAgfSBlbHNlIGlmIChldnQuY2hhbmdlZFRvdWNoZXMgJiYgZXZ0LmNoYW5nZWRUb3VjaGVzWzBdKSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnQuY2hhbmdlZFRvdWNoZXNbMF1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHBvaW50ZXIgPSBldnRcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlciwgdm0pXHJcbiAgfSxcclxuXHJcbiAgZ2V0UGluY2hEaXN0YW5jZSAoZXZ0LCB2bSkge1xyXG4gICAgbGV0IHBvaW50ZXIxID0gZXZ0LnRvdWNoZXNbMF1cclxuICAgIGxldCBwb2ludGVyMiA9IGV2dC50b3VjaGVzWzFdXHJcbiAgICBsZXQgY29vcmQxID0gdGhpcy5vbmVQb2ludENvb3JkKHBvaW50ZXIxLCB2bSlcclxuICAgIGxldCBjb29yZDIgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjIsIHZtKVxyXG5cclxuICAgIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coY29vcmQxLnggLSBjb29yZDIueCwgMikgKyBNYXRoLnBvdyhjb29yZDEueSAtIGNvb3JkMi55LCAyKSlcclxuICB9LFxyXG5cclxuICBnZXRQaW5jaENlbnRlckNvb3JkIChldnQsIHZtKSB7XHJcbiAgICBsZXQgcG9pbnRlcjEgPSBldnQudG91Y2hlc1swXVxyXG4gICAgbGV0IHBvaW50ZXIyID0gZXZ0LnRvdWNoZXNbMV1cclxuICAgIGxldCBjb29yZDEgPSB0aGlzLm9uZVBvaW50Q29vcmQocG9pbnRlcjEsIHZtKVxyXG4gICAgbGV0IGNvb3JkMiA9IHRoaXMub25lUG9pbnRDb29yZChwb2ludGVyMiwgdm0pXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogKGNvb3JkMS54ICsgY29vcmQyLngpIC8gMixcclxuICAgICAgeTogKGNvb3JkMS55ICsgY29vcmQyLnkpIC8gMlxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGltYWdlTG9hZGVkIChpbWcpIHtcclxuICAgIHJldHVybiBpbWcuY29tcGxldGUgJiYgaW1nLm5hdHVyYWxXaWR0aCAhPT0gMFxyXG4gIH0sXHJcblxyXG4gIHJBRlBvbHlmaWxsICgpIHtcclxuICAgIC8vIHJBRiBwb2x5ZmlsbFxyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnKSByZXR1cm5cclxuICAgIHZhciBsYXN0VGltZSA9IDBcclxuICAgIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J11cclxuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsreCkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ11cclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXSB8fCAgICAvLyBXZWJraXTkuK3mraTlj5bmtojmlrnms5XnmoTlkI3lrZflj5jkuoZcclxuICAgICAgICB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKClcclxuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2LjcgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpXHJcbiAgICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyIGFyZyA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbFxyXG4gICAgICAgICAgY2FsbGJhY2soYXJnKVxyXG4gICAgICAgIH0sIHRpbWVUb0NhbGwpXHJcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGxcclxuICAgICAgICByZXR1cm4gaWRcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uIChhcmcpIHtcclxuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmcpID09PSAnW29iamVjdCBBcnJheV0nXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdG9CbG9iUG9seWZpbGwgKCkge1xyXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PSAndW5kZWZpbmVkJyB8fCB0eXBlb2Ygd2luZG93ID09ICd1bmRlZmluZWQnIHx8ICFIVE1MQ2FudmFzRWxlbWVudCkgcmV0dXJuXHJcbiAgICB2YXIgYmluU3RyLCBsZW4sIGFyclxyXG4gICAgaWYgKCFIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUudG9CbG9iKSB7XHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShIVE1MQ2FudmFzRWxlbWVudC5wcm90b3R5cGUsICd0b0Jsb2InLCB7XHJcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChjYWxsYmFjaywgdHlwZSwgcXVhbGl0eSkge1xyXG4gICAgICAgICAgYmluU3RyID0gYXRvYih0aGlzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KS5zcGxpdCgnLCcpWzFdKVxyXG4gICAgICAgICAgbGVuID0gYmluU3RyLmxlbmd0aFxyXG4gICAgICAgICAgYXJyID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG5cclxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgYXJyW2ldID0gYmluU3RyLmNoYXJDb2RlQXQoaSlcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjYWxsYmFjayhuZXcgQmxvYihbYXJyXSwgeyB0eXBlOiB0eXBlIHx8ICdpbWFnZS9wbmcnIH0pKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBldmVudEhhc0ZpbGUgKGV2dCkge1xyXG4gICAgdmFyIGR0ID0gZXZ0LmRhdGFUcmFuc2ZlciB8fCBldnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXJcclxuICAgIGlmIChkdC50eXBlcykge1xyXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gZHQudHlwZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICBpZiAoZHQudHlwZXNbaV0gPT0gJ0ZpbGVzJykge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9LFxyXG5cclxuICBnZXRGaWxlT3JpZW50YXRpb24gKGFycmF5QnVmZmVyKSB7XHJcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhhcnJheUJ1ZmZlcilcclxuICAgIGlmICh2aWV3LmdldFVpbnQxNigwLCBmYWxzZSkgIT0gMHhGRkQ4KSByZXR1cm4gLTJcclxuICAgIHZhciBsZW5ndGggPSB2aWV3LmJ5dGVMZW5ndGhcclxuICAgIHZhciBvZmZzZXQgPSAyXHJcbiAgICB3aGlsZSAob2Zmc2V0IDwgbGVuZ3RoKSB7XHJcbiAgICAgIHZhciBtYXJrZXIgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICBpZiAobWFya2VyID09IDB4RkZFMSkge1xyXG4gICAgICAgIGlmICh2aWV3LmdldFVpbnQzMihvZmZzZXQgKz0gMiwgZmFsc2UpICE9IDB4NDU3ODY5NjYpIHJldHVybiAtMVxyXG4gICAgICAgIHZhciBsaXR0bGUgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQgKz0gNiwgZmFsc2UpID09IDB4NDk0OVxyXG4gICAgICAgIG9mZnNldCArPSB2aWV3LmdldFVpbnQzMihvZmZzZXQgKyA0LCBsaXR0bGUpXHJcbiAgICAgICAgdmFyIHRhZ3MgPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGxpdHRsZSlcclxuICAgICAgICBvZmZzZXQgKz0gMlxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnczsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAodmlldy5nZXRVaW50MTYob2Zmc2V0ICsgKGkgKiAxMiksIGxpdHRsZSkgPT0gMHgwMTEyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2aWV3LmdldFVpbnQxNihvZmZzZXQgKyAoaSAqIDEyKSArIDgsIGxpdHRsZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAoKG1hcmtlciAmIDB4RkYwMCkgIT0gMHhGRjAwKSBicmVha1xyXG4gICAgICBlbHNlIG9mZnNldCArPSB2aWV3LmdldFVpbnQxNihvZmZzZXQsIGZhbHNlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xXHJcbiAgfSxcclxuXHJcbiAgYmFzZTY0VG9BcnJheUJ1ZmZlciAoYmFzZTY0KSB7XHJcbiAgICBiYXNlNjQgPSBiYXNlNjQucmVwbGFjZSgvXmRhdGE6KFteO10rKTtiYXNlNjQsL2dtaSwgJycpXHJcbiAgICB2YXIgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjQpXHJcbiAgICB2YXIgbGVuID0gYmluYXJ5U3RyaW5nLmxlbmd0aFxyXG4gICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkobGVuKVxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYnl0ZXMuYnVmZmVyXHJcbiAgfSxcclxuXHJcbiAgZ2V0Um90YXRlZEltYWdlIChpbWcsIG9yaWVudGF0aW9uKSB7XHJcbiAgICB2YXIgX2NhbnZhcyA9IENhbnZhc0V4aWZPcmllbnRhdGlvbi5kcmF3SW1hZ2UoaW1nLCBvcmllbnRhdGlvbilcclxuICAgIHZhciBfaW1nID0gbmV3IEltYWdlKClcclxuICAgIF9pbWcuc3JjID0gX2NhbnZhcy50b0RhdGFVUkwoKVxyXG4gICAgcmV0dXJuIF9pbWdcclxuICB9LFxyXG5cclxuICBmbGlwWCAob3JpKSB7XHJcbiAgICBpZiAob3JpICUgMiA9PSAwKSB7XHJcbiAgICAgIHJldHVybiBvcmkgLSAxXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9yaSArIDFcclxuICB9LFxyXG5cclxuICBmbGlwWSAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDQsXHJcbiAgICAgIDQ6IDEsXHJcbiAgICAgIDI6IDMsXHJcbiAgICAgIDM6IDIsXHJcbiAgICAgIDU6IDgsXHJcbiAgICAgIDg6IDUsXHJcbiAgICAgIDY6IDcsXHJcbiAgICAgIDc6IDZcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICByb3RhdGU5MCAob3JpKSB7XHJcbiAgICBjb25zdCBtYXAgPSB7XHJcbiAgICAgIDE6IDYsXHJcbiAgICAgIDI6IDcsXHJcbiAgICAgIDM6IDgsXHJcbiAgICAgIDQ6IDUsXHJcbiAgICAgIDU6IDIsXHJcbiAgICAgIDY6IDMsXHJcbiAgICAgIDc6IDQsXHJcbiAgICAgIDg6IDFcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwW29yaV1cclxuICB9LFxyXG5cclxuICBudW1iZXJWYWxpZCAobikge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiAhaXNOYU4obilcclxuICB9XHJcbn0iLCJOdW1iZXIuaXNJbnRlZ2VyID0gTnVtYmVyLmlzSW50ZWdlciB8fCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZSh2YWx1ZSkgJiYgTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlXHJcbn1cclxuXHJcbnZhciBpbml0aWFsSW1hZ2VUeXBlID0gU3RyaW5nXHJcbmlmICh3aW5kb3cgJiYgd2luZG93LkltYWdlKSB7XHJcbiAgaW5pdGlhbEltYWdlVHlwZSA9IFtTdHJpbmcsIEltYWdlXVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgdmFsdWU6IE9iamVjdCxcclxuICB3aWR0aDoge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMjAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBoZWlnaHQ6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDIwMCxcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcGxhY2Vob2xkZXI6IHtcclxuICAgIHR5cGU6IFN0cmluZyxcclxuICAgIGRlZmF1bHQ6ICdDaG9vc2UgYW4gaW1hZ2UnXHJcbiAgfSxcclxuICBwbGFjZWhvbGRlckNvbG9yOiB7XHJcbiAgICBkZWZhdWx0OiAnIzYwNjA2MCdcclxuICB9LFxyXG4gIHBsYWNlaG9sZGVyRm9udFNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlcixcclxuICAgIGRlZmF1bHQ6IDAsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgcmV0dXJuIHZhbCA+PSAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBjYW52YXNDb2xvcjoge1xyXG4gICAgZGVmYXVsdDogJ3RyYW5zcGFyZW50J1xyXG4gIH0sXHJcbiAgcXVhbGl0eToge1xyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgZGVmYXVsdDogMixcclxuICAgIHZhbGlkYXRvcjogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICByZXR1cm4gdmFsID4gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgem9vbVNwZWVkOiB7XHJcbiAgICBkZWZhdWx0OiAzLFxyXG4gICAgdHlwZTogTnVtYmVyLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPiAwXHJcbiAgICB9XHJcbiAgfSxcclxuICBhY2NlcHQ6IFN0cmluZyxcclxuICBmaWxlU2l6ZUxpbWl0OiB7XHJcbiAgICB0eXBlOiBOdW1iZXIsXHJcbiAgICBkZWZhdWx0OiAwLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPj0gMFxyXG4gICAgfVxyXG4gIH0sXHJcbiAgZGlzYWJsZWQ6IEJvb2xlYW4sXHJcbiAgZGlzYWJsZURyYWdBbmREcm9wOiBCb29sZWFuLFxyXG4gIGRpc2FibGVDbGlja1RvQ2hvb3NlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVEcmFnVG9Nb3ZlOiBCb29sZWFuLFxyXG4gIGRpc2FibGVTY3JvbGxUb1pvb206IEJvb2xlYW4sXHJcbiAgZGlzYWJsZVBpbmNoVG9ab29tOiBCb29sZWFuLFxyXG4gIGRpc2FibGVSb3RhdGlvbjogQm9vbGVhbixcclxuICByZXZlcnNlU2Nyb2xsVG9ab29tOiBCb29sZWFuLFxyXG4gIHByZXZlbnRXaGl0ZVNwYWNlOiBCb29sZWFuLFxyXG4gIHNob3dSZW1vdmVCdXR0b246IHtcclxuICAgIHR5cGU6IEJvb2xlYW4sXHJcbiAgICBkZWZhdWx0OiB0cnVlXHJcbiAgfSxcclxuICByZW1vdmVCdXR0b25Db2xvcjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ3JlZCdcclxuICB9LFxyXG4gIHJlbW92ZUJ1dHRvblNpemU6IHtcclxuICAgIHR5cGU6IE51bWJlclxyXG4gIH0sXHJcbiAgaW5pdGlhbEltYWdlOiBpbml0aWFsSW1hZ2VUeXBlLFxyXG4gIGluaXRpYWxTaXplOiB7XHJcbiAgICB0eXBlOiBTdHJpbmcsXHJcbiAgICBkZWZhdWx0OiAnY292ZXInLFxyXG4gICAgdmFsaWRhdG9yOiBmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgIHJldHVybiB2YWwgPT09ICdjb3ZlcicgfHwgdmFsID09PSAnY29udGFpbicgfHwgdmFsID09PSAnbmF0dXJhbCdcclxuICAgIH1cclxuICB9LFxyXG4gIGluaXRpYWxQb3NpdGlvbjoge1xyXG4gICAgdHlwZTogU3RyaW5nLFxyXG4gICAgZGVmYXVsdDogJ2NlbnRlcicsXHJcbiAgICB2YWxpZGF0b3I6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgdmFyIHZhbGlkcyA9IFtcclxuICAgICAgICAnY2VudGVyJyxcclxuICAgICAgICAndG9wJyxcclxuICAgICAgICAnYm90dG9tJyxcclxuICAgICAgICAnbGVmdCcsXHJcbiAgICAgICAgJ3JpZ2h0J1xyXG4gICAgICBdXHJcbiAgICAgIHJldHVybiB2YWwuc3BsaXQoJyAnKS5ldmVyeSh3b3JkID0+IHtcclxuICAgICAgICByZXR1cm4gdmFsaWRzLmluZGV4T2Yod29yZCkgPj0gMFxyXG4gICAgICB9KSB8fCAvXi0/XFxkKyUgLT9cXGQrJSQvLnRlc3QodmFsKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgaW5wdXRBdHRyczogT2JqZWN0XHJcbn0iLCJleHBvcnQgZGVmYXVsdCB7XG4gIElOSVRfRVZFTlQ6ICdpbml0JyxcbiAgRklMRV9DSE9PU0VfRVZFTlQ6ICdmaWxlLWNob29zZScsXG4gIEZJTEVfU0laRV9FWENFRURfRVZFTlQ6ICdmaWxlLXNpemUtZXhjZWVkJyxcbiAgRklMRV9UWVBFX01JU01BVENIX0VWRU5UOiAnZmlsZS10eXBlLW1pc21hdGNoJyxcbiAgTkVXX0lNQUdFOiAnbmV3LWltYWdlJyxcbiAgTkVXX0lNQUdFX0RSQVdOOiAnbmV3LWltYWdlLWRyYXduJyxcbiAgSU1BR0VfUkVNT1ZFX0VWRU5UOiAnaW1hZ2UtcmVtb3ZlJyxcbiAgTU9WRV9FVkVOVDogJ21vdmUnLFxuICBST1RBVEVfRVZFTlQ6ICdyb3RhdGUnLFxuICBaT09NX0VWRU5UOiAnem9vbScsXG4gIERSQVc6ICdkcmF3JyxcbiAgSU5JVElBTF9JTUFHRV9MT0FERURfRVZFTlQ6ICdpbml0aWFsLWltYWdlLWxvYWRlZCdcbn1cbiIsIjx0ZW1wbGF0ZT5cclxuICA8ZGl2IHJlZj1cIndyYXBwZXJcIlxyXG4gICAgICAgOmNsYXNzPVwiYGNyb3BwYS1jb250YWluZXIgJHtpbWcgPyAnY3JvcHBhLS1oYXMtdGFyZ2V0JyA6ICcnfSAke2Rpc2FibGVkID8gJ2Nyb3BwYS0tZGlzYWJsZWQnIDogJyd9ICR7ZGlzYWJsZUNsaWNrVG9DaG9vc2UgPyAnY3JvcHBhLS1kaXNhYmxlZC1jYycgOiAnJ30gJHtkaXNhYmxlRHJhZ1RvTW92ZSAmJiBkaXNhYmxlU2Nyb2xsVG9ab29tID8gJ2Nyb3BwYS0tZGlzYWJsZWQtbXonIDogJyd9ICR7ZmlsZURyYWdnZWRPdmVyID8gJ2Nyb3BwYS0tZHJvcHpvbmUnIDogJyd9YFwiXHJcbiAgICAgICBAZHJhZ2VudGVyLnN0b3AucHJldmVudD1cIl9oYW5kbGVEcmFnRW50ZXJcIlxyXG4gICAgICAgQGRyYWdsZWF2ZS5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ0xlYXZlXCJcclxuICAgICAgIEBkcmFnb3Zlci5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlRHJhZ092ZXJcIlxyXG4gICAgICAgQGRyb3Auc3RvcC5wcmV2ZW50PVwiX2hhbmRsZURyb3BcIj5cclxuICAgIDxpbnB1dCB0eXBlPVwiZmlsZVwiXHJcbiAgICAgICAgICAgOmFjY2VwdD1cImFjY2VwdFwiXHJcbiAgICAgICAgICAgOmRpc2FibGVkPVwiZGlzYWJsZWRcIlxyXG4gICAgICAgICAgIHYtYmluZD1cImlucHV0QXR0cnNcIlxyXG4gICAgICAgICAgIHJlZj1cImZpbGVJbnB1dFwiXHJcbiAgICAgICAgICAgQGNoYW5nZT1cIl9oYW5kbGVJbnB1dENoYW5nZVwiXHJcbiAgICAgICAgICAgc3R5bGU9XCJoZWlnaHQ6MXB4O3dpZHRoOjFweDtvdmVyZmxvdzpoaWRkZW47bWFyZ2luLWxlZnQ6LTk5OTk5cHg7cG9zaXRpb246YWJzb2x1dGU7XCIgLz5cclxuICAgIDxkaXYgY2xhc3M9XCJzbG90c1wiXHJcbiAgICAgICAgIHN0eWxlPVwid2lkdGg6IDA7IGhlaWdodDogMDsgdmlzaWJpbGl0eTogaGlkZGVuO1wiPlxyXG4gICAgICA8c2xvdCBuYW1lPVwiaW5pdGlhbFwiPjwvc2xvdD5cclxuICAgICAgPHNsb3QgbmFtZT1cInBsYWNlaG9sZGVyXCI+PC9zbG90PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8Y2FudmFzIHJlZj1cImNhbnZhc1wiXHJcbiAgICAgICAgICAgIEBjbGljay5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlQ2xpY2tcIlxyXG4gICAgICAgICAgICBAdG91Y2hzdGFydC5zdG9wPVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBtb3VzZWRvd24uc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEBwb2ludGVyc3RhcnQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJTdGFydFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGVuZC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaGNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEBtb3VzZXVwLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyRW5kXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJlbmQuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJFbmRcIlxyXG4gICAgICAgICAgICBAcG9pbnRlcmNhbmNlbC5zdG9wLnByZXZlbnQ9XCJfaGFuZGxlUG9pbnRlckVuZFwiXHJcbiAgICAgICAgICAgIEB0b3VjaG1vdmUuc3RvcD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBtb3VzZW1vdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJNb3ZlXCJcclxuICAgICAgICAgICAgQHBvaW50ZXJtb3ZlLnN0b3AucHJldmVudD1cIl9oYW5kbGVQb2ludGVyTW92ZVwiXHJcbiAgICAgICAgICAgIEBwb2ludGVybGVhdmUuc3RvcC5wcmV2ZW50PVwiX2hhbmRsZVBvaW50ZXJMZWF2ZVwiXHJcbiAgICAgICAgICAgIEBET01Nb3VzZVNjcm9sbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCJcclxuICAgICAgICAgICAgQHdoZWVsLnN0b3A9XCJfaGFuZGxlV2hlZWxcIlxyXG4gICAgICAgICAgICBAbW91c2V3aGVlbC5zdG9wPVwiX2hhbmRsZVdoZWVsXCI+PC9jYW52YXM+XHJcbiAgICA8c3ZnIGNsYXNzPVwiaWNvbiBpY29uLXJlbW92ZVwiXHJcbiAgICAgICAgIHYtaWY9XCJzaG93UmVtb3ZlQnV0dG9uICYmIGltZ1wiXHJcbiAgICAgICAgIEBjbGljaz1cInJlbW92ZVwiXHJcbiAgICAgICAgIDpzdHlsZT1cImB0b3A6IC0ke2hlaWdodC80MH1weDsgcmlnaHQ6IC0ke3dpZHRoLzQwfXB4YFwiXHJcbiAgICAgICAgIHZpZXdCb3g9XCIwIDAgMTAyNCAxMDI0XCJcclxuICAgICAgICAgdmVyc2lvbj1cIjEuMVwiXHJcbiAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxyXG4gICAgICAgICB4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIlxyXG4gICAgICAgICA6d2lkdGg9XCJyZW1vdmVCdXR0b25TaXplIHx8IHdpZHRoLzEwXCJcclxuICAgICAgICAgOmhlaWdodD1cInJlbW92ZUJ1dHRvblNpemUgfHwgd2lkdGgvMTBcIj5cclxuICAgICAgPHBhdGggZD1cIk01MTEuOTIxMjMxIDBDMjI5LjE3OTA3NyAwIDAgMjI5LjI1Nzg0NiAwIDUxMiAwIDc5NC43MDI3NjkgMjI5LjE3OTA3NyAxMDI0IDUxMS45MjEyMzEgMTAyNCA3OTQuNzgxNTM4IDEwMjQgMTAyNCA3OTQuNzAyNzY5IDEwMjQgNTEyIDEwMjQgMjI5LjI1Nzg0NiA3OTQuNzgxNTM4IDAgNTExLjkyMTIzMSAwWk03MzIuMDQxODQ2IDY1MC42MzM4NDYgNjUwLjUxNTY5MiA3MzIuMDgxMjMxQzY1MC41MTU2OTIgNzMyLjA4MTIzMSA1MjEuNDkxNjkyIDU5My42ODM2OTIgNTExLjg4MTg0NiA1OTMuNjgzNjkyIDUwMi40Mjk1MzggNTkzLjY4MzY5MiAzNzMuMzY2MTU0IDczMi4wODEyMzEgMzczLjM2NjE1NCA3MzIuMDgxMjMxTDI5MS43NjEyMzEgNjUwLjYzMzg0NkMyOTEuNzYxMjMxIDY1MC42MzM4NDYgNDMwLjMxNjMwOCA1MjMuNTAwMzA4IDQzMC4zMTYzMDggNTEyLjE5NjkyMyA0MzAuMzE2MzA4IDUwMC42OTY2MTUgMjkxLjc2MTIzMSAzNzMuNTIzNjkyIDI5MS43NjEyMzEgMzczLjUyMzY5MkwzNzMuMzY2MTU0IDI5MS45MTg3NjlDMzczLjM2NjE1NCAyOTEuOTE4NzY5IDUwMy40NTM1MzggNDMwLjM5NTA3NyA1MTEuODgxODQ2IDQzMC4zOTUwNzcgNTIwLjM0OTUzOCA0MzAuMzk1MDc3IDY1MC41MTU2OTIgMjkxLjkxODc2OSA2NTAuNTE1NjkyIDI5MS45MTg3NjlMNzMyLjA0MTg0NiAzNzMuNTIzNjkyQzczMi4wNDE4NDYgMzczLjUyMzY5MiA1OTMuNDQ3Mzg1IDUwMi41NDc2OTIgNTkzLjQ0NzM4NSA1MTIuMTk2OTIzIDU5My40NDczODUgNTIxLjQxMjkyMyA3MzIuMDQxODQ2IDY1MC42MzM4NDYgNzMyLjA0MTg0NiA2NTAuNjMzODQ2WlwiXHJcbiAgICAgICAgICAgIDpmaWxsPVwicmVtb3ZlQnV0dG9uQ29sb3JcIj48L3BhdGg+XHJcbiAgICA8L3N2Zz5cclxuICA8L2Rpdj5cclxuPC90ZW1wbGF0ZT5cclxuXHJcbjxzY3JpcHQ+XHJcbiAgICBpbXBvcnQgdSBmcm9tICcuL3V0aWwnXHJcbiAgICBpbXBvcnQgcHJvcHMgZnJvbSAnLi9wcm9wcydcclxuICAgIGltcG9ydCBldmVudHMgZnJvbSAnLi9ldmVudHMnXHJcbiAgICBjb25zdCBQQ1RfUEVSX1pPT00gPSAxIC8gMTAwMDAwIC8vIFRoZSBhbW91bnQgb2Ygem9vbWluZyBldmVyeXRpbWUgaXQgaGFwcGVucywgaW4gcGVyY2VudGFnZSBvZiBpbWFnZSB3aWR0aC5cclxuICAgIGNvbnN0IE1JTl9NU19QRVJfQ0xJQ0sgPSA1MDAgLy8gSWYgdG91Y2ggZHVyYXRpb24gaXMgc2hvcnRlciB0aGFuIHRoZSB2YWx1ZSwgdGhlbiBpdCBpcyBjb25zaWRlcmVkIGFzIGEgY2xpY2suXHJcbiAgICBjb25zdCBDTElDS19NT1ZFX1RIUkVTSE9MRCA9IDEwMCAvLyBJZiB0b3VjaCBtb3ZlIGRpc3RhbmNlIGlzIGdyZWF0ZXIgdGhhbiB0aGlzIHZhbHVlLCB0aGVuIGl0IHdpbGwgYnkgbm8gbWVhbiBiZSBjb25zaWRlcmVkIGFzIGEgY2xpY2suXHJcbiAgICBjb25zdCBNSU5fV0lEVEggPSAxMCAvLyBUaGUgbWluaW1hbCB3aWR0aCB0aGUgdXNlciBjYW4gem9vbSB0by5cclxuICAgIGNvbnN0IERFRkFVTFRfUExBQ0VIT0xERVJfVEFLRVVQID0gMiAvIDMgLy8gUGxhY2Vob2xkZXIgdGV4dCBieSBkZWZhdWx0IHRha2VzIHVwIHRoaXMgYW1vdW50IG9mIHRpbWVzIG9mIGNhbnZhcyB3aWR0aC5cclxuICAgIGNvbnN0IFBJTkNIX0FDQ0VMRVJBVElPTiA9IDEgLy8gVGhlIGFtb3VudCBvZiB0aW1lcyBieSB3aGljaCB0aGUgcGluY2hpbmcgaXMgbW9yZSBzZW5zaXRpdmUgdGhhbiB0aGUgc2NvbGxpbmdcclxuICAgIC8vIGNvbnN0IERFQlVHID0gZmFsc2VcclxuICAgIGV4cG9ydCBkZWZhdWx0IHtcclxuICAgICAgICBtb2RlbDoge1xyXG4gICAgICAgICAgICBwcm9wOiAndmFsdWUnLFxyXG4gICAgICAgICAgICBldmVudDogZXZlbnRzLklOSVRfRVZFTlRcclxuICAgICAgICB9LFxyXG4gICAgICAgIHByb3BzOiBwcm9wcyxcclxuICAgICAgICBkYXRhICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGNhbnZhczogbnVsbCxcclxuICAgICAgICAgICAgICAgIGN0eDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsSW1hZ2U6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpbWc6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsYXN0TW92aW5nQ29vcmQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0WDogMCxcclxuICAgICAgICAgICAgICAgICAgICBzdGFydFk6IDBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBmaWxlRHJhZ2dlZE92ZXI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdGFiU3RhcnQ6IDAsXHJcbiAgICAgICAgICAgICAgICBzY3JvbGxpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcGluY2hpbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcGluY2hEaXN0YW5jZTogMCxcclxuICAgICAgICAgICAgICAgIHN1cHBvcnRUb3VjaDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBwb2ludGVyTW92ZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcG9pbnRlclN0YXJ0Q29vcmQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBuYXR1cmFsV2lkdGg6IDAsXHJcbiAgICAgICAgICAgICAgICBuYXR1cmFsSGVpZ2h0OiAwLFxyXG4gICAgICAgICAgICAgICAgc2NhbGVSYXRpbzogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9yaWVudGF0aW9uOiAxLFxyXG4gICAgICAgICAgICAgICAgdXNlck1ldGFkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaW1hZ2VTZXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgY3VycmVudFBvaW50ZXJDb29yZDogbnVsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb21wdXRlZDoge1xyXG4gICAgICAgICAgICBvdXRwdXRXaWR0aCAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53aWR0aCAqIHRoaXMucXVhbGl0eVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvdXRwdXRIZWlnaHQgKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGVpZ2h0ICogdGhpcy5xdWFsaXR5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZSAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wbGFjZWhvbGRlckZvbnRTaXplICogdGhpcy5xdWFsaXR5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGFzcGVjdFJhdGlvICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5hdHVyYWxXaWR0aCAvIHRoaXMubmF0dXJhbEhlaWdodFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBtb3VudGVkICgpIHtcclxuICAgICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgICAgIHUuckFGUG9seWZpbGwoKVxyXG4gICAgICAgICAgICB1LnRvQmxvYlBvbHlmaWxsKClcclxuICAgICAgICAgICAgbGV0IHN1cHBvcnRzID0gdGhpcy5zdXBwb3J0RGV0ZWN0aW9uKClcclxuICAgICAgICAgICAgaWYgKCFzdXBwb3J0cy5iYXNpYykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB2dWUtY3JvcHBhIGZ1bmN0aW9uYWxpdHkuJylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd2F0Y2g6IHtcclxuICAgICAgICAgICAgb3V0cHV0V2lkdGg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2VTZXQgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZXRTaXplKClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wbGFjZUltYWdlKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb3V0cHV0SGVpZ2h0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0U2l6ZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNhbnZhc0NvbG9yOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2luaXQoKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kcmF3KClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyQ29sb3I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5pdCgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNvbXB1dGVkUGxhY2Vob2xkZXJGb250U2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pbml0KClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcHJldmVudFdoaXRlU3BhY2UgKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2VTZXQgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcGxhY2VJbWFnZSgpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNjYWxlUmF0aW8gKHZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXUubnVtYmVyVmFsaWQodmFsKSkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB2YXIgeCA9IDFcclxuICAgICAgICAgICAgICAgIGlmICh1Lm51bWJlclZhbGlkKG9sZFZhbCkgJiYgb2xkVmFsICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeCA9IHZhbCAvIG9sZFZhbFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHRoaXMuY3VycmVudFBvaW50ZXJDb29yZCB8fCB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogdGhpcy5pbWdEYXRhLnN0YXJ0WCArIHRoaXMuaW1nRGF0YS53aWR0aCAvIDIsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogdGhpcy5pbWdEYXRhLnN0YXJ0WSArIHRoaXMuaW1nRGF0YS5oZWlnaHQgLyAyXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSB0aGlzLm5hdHVyYWxXaWR0aCAqIHZhbFxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodCAqIHZhbFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJldmVudFdoaXRlU3BhY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2ZW50Wm9vbWluZ1RvV2hpdGVTcGFjZSgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VyTWV0YWRhdGEpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLSEhIS0tLS0tLS0tLS0nKVxyXG4gICAgICAgICAgICAgICAgbGV0IG9mZnNldFggPSAoeCAtIDEpICogKHBvcy54IC0gdGhpcy5pbWdEYXRhLnN0YXJ0WClcclxuICAgICAgICAgICAgICAgIGxldCBvZmZzZXRZID0gKHggLSAxKSAqIChwb3MueSAtIHRoaXMuaW1nRGF0YS5zdGFydFkpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gdGhpcy5pbWdEYXRhLnN0YXJ0WCAtIG9mZnNldFhcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSB0aGlzLmltZ0RhdGEuc3RhcnRZIC0gb2Zmc2V0WVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAnaW1nRGF0YS53aWR0aCc6IGZ1bmN0aW9uICh2YWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF1Lm51bWJlclZhbGlkKHZhbCkpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdmFsIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc0ltYWdlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnModmFsIC0gb2xkVmFsKSA+ICh2YWwgKiAoMSAvIDEwMDAwMCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLlpPT01fRVZFTlQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2RyYXcoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ2ltZ0RhdGEuaGVpZ2h0JzogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF1Lm51bWJlclZhbGlkKHZhbCkpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zY2FsZVJhdGlvID0gdmFsIC8gdGhpcy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgZ2V0Q2FudmFzICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhc1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDb250ZXh0ICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmN0eFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRDaG9zZW5GaWxlICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRyZWZzLmZpbGVJbnB1dC5maWxlc1swXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtb3ZlIChvZmZzZXQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghb2Zmc2V0KSByZXR1cm5cclxuICAgICAgICAgICAgICAgIGxldCBvbGRYID0gdGhpcy5pbWdEYXRhLnN0YXJ0WFxyXG4gICAgICAgICAgICAgICAgbGV0IG9sZFkgPSB0aGlzLmltZ0RhdGEuc3RhcnRZXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYICs9IG9mZnNldC54XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZICs9IG9mZnNldC55XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZlbnRNb3ZpbmdUb1doaXRlU3BhY2UoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS5zdGFydFggIT09IG9sZFggfHwgdGhpcy5pbWdEYXRhLnN0YXJ0WSAhPT0gb2xkWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk1PVkVfRVZFTlQpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZHJhdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1vdmVVcHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoeyB4OiAwLCB5OiAtYW1vdW50IH0pXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1vdmVEb3dud2FyZHMgKGFtb3VudCA9IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZSh7IHg6IDAsIHk6IGFtb3VudCB9KVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBtb3ZlTGVmdHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoeyB4OiAtYW1vdW50LCB5OiAwIH0pXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1vdmVSaWdodHdhcmRzIChhbW91bnQgPSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoeyB4OiBhbW91bnQsIHk6IDAgfSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgem9vbSAoem9vbUluID0gdHJ1ZSwgYWNjZWxlcmF0aW9uID0gMSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlYWxTcGVlZCA9IHRoaXMuem9vbVNwZWVkICogYWNjZWxlcmF0aW9uXHJcbiAgICAgICAgICAgICAgICBsZXQgc3BlZWQgPSAodGhpcy5vdXRwdXRXaWR0aCAqIFBDVF9QRVJfWk9PTSkgKiByZWFsU3BlZWRcclxuICAgICAgICAgICAgICAgIGxldCB4ID0gMVxyXG4gICAgICAgICAgICAgICAgaWYgKHpvb21Jbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHggPSAxICsgc3BlZWRcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbWdEYXRhLndpZHRoID4gTUlOX1dJRFRIKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeCA9IDEgLSBzcGVlZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zY2FsZVJhdGlvICo9IHhcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgem9vbUluICgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbSh0cnVlKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB6b29tT3V0ICgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbShmYWxzZSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcm90YXRlIChzdGVwID0gMSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzYWJsZVJvdGF0aW9uIHx8IHRoaXMuZGlzYWJsZWQpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgc3RlcCA9IHBhcnNlSW50KHN0ZXApXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4oc3RlcCkgfHwgc3RlcCA+IDMgfHwgc3RlcCA8IC0zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdJbnZhbGlkIGFyZ3VtZW50IGZvciByb3RhdGUoKSBtZXRob2QuIEl0IHNob3VsZCBvbmUgb2YgdGhlIGludGVnZXJzIGZyb20gLTMgdG8gMy4nKVxyXG4gICAgICAgICAgICAgICAgICAgIHN0ZXAgPSAxXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9yb3RhdGVCeVN0ZXAoc3RlcClcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcm90YXRlQ0NXOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvdGF0ZURlZ3JlZXMoLTkwKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByb3RhdGVDVzogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb3RhdGVEZWdyZWVzKDkwKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByb3RhdGVEZWdyZWVzIChkZWdyZWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWRlZ3JlZXMpIHJldHVyblxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4LnRyYW5zbGF0ZSh0aGlzLmNhbnZhcy53aWR0aCAvIDIsIHRoaXMuY2FudmFzLmhlaWdodCAvIDIpOyAvLyBtb3ZlIHRvIGNlbnRlclxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdHgucm90YXRlKGRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwKVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNwZWNpYWwgZHJhd2luZyBhZnRlciByb3RhdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICBpZiAod2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFpbnRCYWNrZ3JvdW5kKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKHRoaXMuaW1nLCAtdGhpcy5jYW52YXMud2lkdGgvMiwgLXRoaXMuY2FudmFzLmhlaWdodC8yLCB0aGlzLmNhbnZhcy5oZWlnaHQsIHRoaXMuY2FudmFzLndpZHRoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFpbnRCYWNrZ3JvdW5kKClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UodGhpcy5pbWcsIC10aGlzLmNhbnZhcy53aWR0aC8yLCAtdGhpcy5jYW52YXMuaGVpZ2h0LzIsIHRoaXMuY2FudmFzLmhlaWdodCwgdGhpcy5jYW52YXMud2lkdGgpXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdHgudHJhbnNsYXRlKC0odGhpcy5jYW52YXMud2lkdGggLyAyKSwgLSh0aGlzLmNhbnZhcy5oZWlnaHQgLyAyKSk7IC8vIG1vdmUgdG8gdG9wIGxlZnQgY29ybmVyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXcoKVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZW1pdChldmVudHMuUk9UQVRFX0VWRU5UKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbGlwWCAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlUm90YXRpb24gfHwgdGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRPcmllbnRhdGlvbigyKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbGlwWSAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlUm90YXRpb24gfHwgdGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRPcmllbnRhdGlvbig0KVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZWZyZXNoICgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJG5leHRUaWNrKHRoaXMuX2luaXQpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGhhc0ltYWdlICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXRoaXMuaW1hZ2VTZXRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYXBwbHlNZXRhZGF0YSAobWV0YWRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmICghbWV0YWRhdGEgfHwgIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVzZXJNZXRhZGF0YSA9IG1ldGFkYXRhXHJcbiAgICAgICAgICAgICAgICB2YXIgb3JpID0gbWV0YWRhdGEub3JpZW50YXRpb24gfHwgdGhpcy5vcmllbnRhdGlvbiB8fCAxXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRPcmllbnRhdGlvbihvcmksIHRydWUpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGdlbmVyYXRlRGF0YVVybCAodHlwZSwgY29tcHJlc3Npb25SYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuICcnXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYW52YXMudG9EYXRhVVJMKHR5cGUsIGNvbXByZXNzaW9uUmF0ZSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZ2VuZXJhdGVCbG9iIChjYWxsYmFjaywgbWltZVR5cGUsIHF1YWxpdHlBcmd1bWVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHJldHVybiBudWxsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy50b0Jsb2IoY2FsbGJhY2ssIG1pbWVUeXBlLCBxdWFsaXR5QXJndW1lbnQpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHByb21pc2VkQmxvYiAoLi4uYXJncykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBQcm9taXNlID09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdObyBQcm9taXNlIHN1cHBvcnQuIFBsZWFzZSBhZGQgUHJvbWlzZSBwb2x5ZmlsbCBpZiB5b3Ugd2FudCB0byB1c2UgdGhpcyBtZXRob2QuJylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZUJsb2IoKGJsb2IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYmxvYilcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgYXJncylcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycilcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBnZXRNZXRhZGF0YSAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSkgcmV0dXJuIHt9XHJcbiAgICAgICAgICAgICAgICBsZXQgeyBzdGFydFgsIHN0YXJ0WSB9ID0gdGhpcy5pbWdEYXRhXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0WCxcclxuICAgICAgICAgICAgICAgICAgICBzdGFydFksXHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHRoaXMuc2NhbGVSYXRpbyxcclxuICAgICAgICAgICAgICAgICAgICBvcmllbnRhdGlvbjogdGhpcy5vcmllbnRhdGlvblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdXBwb3J0RGV0ZWN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAnYmFzaWMnOiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICYmIHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYixcclxuICAgICAgICAgICAgICAgICAgICAnZG5kJzogJ29uZHJhZ3N0YXJ0JyBpbiBkaXYgJiYgJ29uZHJvcCcgaW4gZGl2XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGNob29zZUZpbGUgKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kcmVmcy5maWxlSW5wdXQuY2xpY2soKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICByZW1vdmUgKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wYWludEJhY2tncm91bmQoKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0SW1hZ2VQbGFjZWhvbGRlcigpXHJcbiAgICAgICAgICAgICAgICBjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSdcclxuICAgICAgICAgICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJ1xyXG4gICAgICAgICAgICAgICAgbGV0IGRlZmF1bHRGb250U2l6ZSA9IHRoaXMub3V0cHV0V2lkdGggKiBERUZBVUxUX1BMQUNFSE9MREVSX1RBS0VVUCAvIHRoaXMucGxhY2Vob2xkZXIubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICBsZXQgZm9udFNpemUgPSAoIXRoaXMuY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplIHx8IHRoaXMuY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplID09IDApID8gZGVmYXVsdEZvbnRTaXplIDogdGhpcy5jb21wdXRlZFBsYWNlaG9sZGVyRm9udFNpemVcclxuICAgICAgICAgICAgICAgIGN0eC5mb250ID0gZm9udFNpemUgKyAncHggc2Fucy1zZXJpZidcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAoIXRoaXMucGxhY2Vob2xkZXJDb2xvciB8fCB0aGlzLnBsYWNlaG9sZGVyQ29sb3IgPT0gJ2RlZmF1bHQnKSA/ICcjNjA2MDYwJyA6IHRoaXMucGxhY2Vob2xkZXJDb2xvclxyXG4gICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMucGxhY2Vob2xkZXIsIHRoaXMub3V0cHV0V2lkdGggLyAyLCB0aGlzLm91dHB1dEhlaWdodCAvIDIpXHJcbiAgICAgICAgICAgICAgICBsZXQgaGFkSW1hZ2UgPSB0aGlzLmltZyAhPSBudWxsXHJcbiAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsSW1hZ2UgPSBudWxsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZyA9IG51bGxcclxuICAgICAgICAgICAgICAgIHRoaXMuJHJlZnMuZmlsZUlucHV0LnZhbHVlID0gJydcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMCxcclxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRYOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0WTogMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IDFcclxuICAgICAgICAgICAgICAgIHRoaXMuc2NhbGVSYXRpbyA9IG51bGxcclxuICAgICAgICAgICAgICAgIHRoaXMudXNlck1ldGFkYXRhID0gbnVsbFxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWFnZVNldCA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFkSW1hZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTUFHRV9SRU1PVkVfRVZFTlQpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9pbml0ICgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzID0gdGhpcy4kcmVmcy5jYW52YXNcclxuICAgICAgICAgICAgICAgIHRoaXMuX3NldFNpemUoKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gKCF0aGlzLmNhbnZhc0NvbG9yIHx8IHRoaXMuY2FudmFzQ29sb3IgPT0gJ2RlZmF1bHQnKSA/ICd0cmFuc3BhcmVudCcgOiAodHlwZW9mIHRoaXMuY2FudmFzQ29sb3IgPT09ICdzdHJpbmcnID8gdGhpcy5jYW52YXNDb2xvciA6ICcnKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXHJcbiAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsSW1hZ2UgPSBudWxsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZyA9IG51bGxcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2VTZXQgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0SW5pdGlhbCgpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUX0VWRU5ULCB0aGlzKVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfc2V0U2l6ZSAoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS53aWR0aCA9IHRoaXMud2lkdGggKyAncHgnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5oZWlnaHQgPSB0aGlzLmhlaWdodCArICdweCdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX3JvdGF0ZUJ5U3RlcCAoc3RlcCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9yaWVudGF0aW9uID0gMVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChzdGVwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmllbnRhdGlvbiA9IDZcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWVudGF0aW9uID0gM1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSA4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAtMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSA4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAtMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSAzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAtMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSA2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRPcmllbnRhdGlvbihvcmllbnRhdGlvbilcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX3NldEltYWdlUGxhY2Vob2xkZXIgKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGltZ1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHNsb3RzLnBsYWNlaG9sZGVyICYmIHRoaXMuJHNsb3RzLnBsYWNlaG9sZGVyWzBdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZOb2RlID0gdGhpcy4kc2xvdHMucGxhY2Vob2xkZXJbMF1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgeyB0YWcsIGVsbSB9ID0gdk5vZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFnID09ICdpbWcnICYmIGVsbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWcgPSBlbG1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIWltZykgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB2YXIgb25Mb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHRoaXMub3V0cHV0V2lkdGgsIHRoaXMub3V0cHV0SGVpZ2h0KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHUuaW1hZ2VMb2FkZWQoaW1nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9uTG9hZCgpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGltZy5vbmxvYWQgPSBvbkxvYWRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX3NldEluaXRpYWwgKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHNyYywgaW1nXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2xvdHMuaW5pdGlhbCAmJiB0aGlzLiRzbG90cy5pbml0aWFsWzBdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZOb2RlID0gdGhpcy4kc2xvdHMuaW5pdGlhbFswXVxyXG4gICAgICAgICAgICAgICAgICAgIGxldCB7IHRhZywgZWxtIH0gPSB2Tm9kZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWcgPT0gJ2ltZycgJiYgZWxtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltZyA9IGVsbVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluaXRpYWxJbWFnZSAmJiB0eXBlb2YgdGhpcy5pbml0aWFsSW1hZ2UgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gdGhpcy5pbml0aWFsSW1hZ2VcclxuICAgICAgICAgICAgICAgICAgICBpbWcgPSBuZXcgSW1hZ2UoKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghL15kYXRhOi8udGVzdChzcmMpICYmICEvXmJsb2I6Ly50ZXN0KHNyYykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1nLnNldEF0dHJpYnV0ZSgnY3Jvc3NPcmlnaW4nLCAnYW5vbnltb3VzJylcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaW1nLnNyYyA9IHNyY1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5pbml0aWFsSW1hZ2UgPT09ICdvYmplY3QnICYmIHRoaXMuaW5pdGlhbEltYWdlIGluc3RhbmNlb2YgSW1hZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbWcgPSB0aGlzLmluaXRpYWxJbWFnZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFzcmMgJiYgIWltZykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh1LmltYWdlTG9hZGVkKGltZykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbmxvYWQoaW1nLCAraW1nLmRhdGFzZXRbJ2V4aWZPcmllbnRhdGlvbiddKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5JTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25sb2FkKGltZywgK2ltZy5kYXRhc2V0WydleGlmT3JpZW50YXRpb24nXSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaW1nLm9uZXJyb3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9vbmxvYWQgKGltZywgb3JpZW50YXRpb24gPSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsSW1hZ2UgPSBpbWdcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1nID0gaW1nXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4ob3JpZW50YXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSAxXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRPcmllbnRhdGlvbihvcmllbnRhdGlvbilcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX2hhbmRsZUNsaWNrICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNJbWFnZSgpICYmICF0aGlzLmRpc2FibGVDbGlja1RvQ2hvb3NlICYmICF0aGlzLmRpc2FibGVkICYmICF0aGlzLnN1cHBvcnRUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hvb3NlRmlsZSgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9oYW5kbGVJbnB1dENoYW5nZSAoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSB0aGlzLiRyZWZzLmZpbGVJbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5maWxlcy5sZW5ndGgpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgbGV0IGZpbGUgPSBpbnB1dC5maWxlc1swXVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fb25OZXdGaWxlSW4oZmlsZSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX29uTmV3RmlsZUluIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5GSUxFX0NIT09TRV9FVkVOVCwgZmlsZSlcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fZmlsZVNpemVJc1ZhbGlkKGZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZW1pdChldmVudHMuRklMRV9TSVpFX0VYQ0VFRF9FVkVOVCwgZmlsZSlcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgc2l6ZSBleGNlZWRzIGxpbWl0IHdoaWNoIGlzICcgKyB0aGlzLmZpbGVTaXplTGltaXQgKyAnIGJ5dGVzLicpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX2ZpbGVUeXBlSXNWYWxpZChmaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLkZJTEVfVFlQRV9NSVNNQVRDSF9FVkVOVCwgZmlsZSlcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdHlwZSA9IGZpbGUudHlwZSB8fCBmaWxlLm5hbWUudG9Mb3dlckNhc2UoKS5zcGxpdCgnLicpLnBvcCgpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHR5cGUgKCR7dHlwZX0pIGRvZXMgbm90IG1hdGNoIHdoYXQgeW91IHNwZWNpZmllZCAoJHt0aGlzLmFjY2VwdH0pLmApXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5GaWxlUmVhZGVyICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgICAgICAgICAgICAgICAgICBmci5vbmxvYWQgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZURhdGEgPSBlLnRhcmdldC5yZXN1bHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9yaWVudGF0aW9uID0gMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50YXRpb24gPSB1LmdldEZpbGVPcmllbnRhdGlvbih1LmJhc2U2NFRvQXJyYXlCdWZmZXIoZmlsZURhdGEpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPCAxKSBvcmllbnRhdGlvbiA9IDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltZy5zcmMgPSBmaWxlRGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25sb2FkKGltZywgb3JpZW50YXRpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5ORVdfSU1BR0UpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZnIucmVhZEFzRGF0YVVSTChmaWxlKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfZmlsZVNpemVJc1ZhbGlkIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmZpbGVTaXplTGltaXQgfHwgdGhpcy5maWxlU2l6ZUxpbWl0ID09IDApIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZS5zaXplIDwgdGhpcy5maWxlU2l6ZUxpbWl0XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9maWxlVHlwZUlzVmFsaWQgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5hY2NlcGN0KSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgbGV0IGFjY2VwdCA9IHRoaXMuYWNjZXB0XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFzZU1pbWV0eXBlID0gYWNjZXB0LnJlcGxhY2UoL1xcLy4qJC8sICcnKVxyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGVzID0gYWNjZXB0LnNwbGl0KCcsJylcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0eXBlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlID0gdHlwZXNbaV1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgdCA9IHR5cGUudHJpbSgpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQuY2hhckF0KDApID09ICcuJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZS5uYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKS5wb3AoKSA9PT0gdC50b0xvd2VyQ2FzZSgpLnNsaWNlKDEpKSByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoL1xcL1xcKiQvLnRlc3QodCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVCYXNlVHlwZSA9IGZpbGUudHlwZS5yZXBsYWNlKC9cXC8uKiQvLCAnJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVCYXNlVHlwZSA9PT0gYmFzZU1pbWV0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmaWxlLnR5cGUgPT09IHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX3BsYWNlSW1hZ2UgKGFwcGx5TWV0YWRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pbWcpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgdmFyIGltZ0RhdGEgPSB0aGlzLmltZ0RhdGFcclxuICAgICAgICAgICAgICAgIHRoaXMubmF0dXJhbFdpZHRoID0gdGhpcy5pbWcubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hdHVyYWxIZWlnaHQgPSB0aGlzLmltZy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHUubnVtYmVyVmFsaWQoaW1nRGF0YS5zdGFydFgpID8gaW1nRGF0YS5zdGFydFggOiAwXHJcbiAgICAgICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WSA9IHUubnVtYmVyVmFsaWQoaW1nRGF0YS5zdGFydFkpID8gaW1nRGF0YS5zdGFydFkgOiAwXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcmV2ZW50V2hpdGVTcGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FzcGVjdEZpbGwoKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pbWFnZVNldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmluaXRpYWxTaXplID09ICdjb250YWluJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hc3BlY3RGaXQoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbml0aWFsU2l6ZSA9PSAnbmF0dXJhbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmF0dXJhbFNpemUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FzcGVjdEZpbGwoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gdGhpcy5uYXR1cmFsV2lkdGggKiB0aGlzLnNjYWxlUmF0aW9cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuaGVpZ2h0ID0gdGhpcy5uYXR1cmFsSGVpZ2h0ICogdGhpcy5zY2FsZVJhdGlvXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaW1hZ2VTZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoL3RvcC8udGVzdCh0aGlzLmluaXRpYWxQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1nRGF0YS5zdGFydFkgPSAwXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgvYm90dG9tLy50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WSA9IHRoaXMub3V0cHV0SGVpZ2h0IC0gaW1nRGF0YS5oZWlnaHRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKC9sZWZ0Ly50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKC9yaWdodC8udGVzdCh0aGlzLmluaXRpYWxQb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1nRGF0YS5zdGFydFggPSB0aGlzLm91dHB1dFdpZHRoIC0gaW1nRGF0YS53aWR0aFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoL14tP1xcZCslIC0/XFxkKyUkLy50ZXN0KHRoaXMuaW5pdGlhbFBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gL14oLT9cXGQrKSUgKC0/XFxkKyklJC8uZXhlYyh0aGlzLmluaXRpYWxQb3NpdGlvbilcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHggPSArcmVzdWx0WzFdIC8gMTAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB5ID0gK3Jlc3VsdFsyXSAvIDEwMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbWdEYXRhLnN0YXJ0WCA9IHggKiAodGhpcy5vdXRwdXRXaWR0aCAtIGltZ0RhdGEud2lkdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltZ0RhdGEuc3RhcnRZID0geSAqICh0aGlzLm91dHB1dEhlaWdodCAtIGltZ0RhdGEuaGVpZ2h0KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFwcGx5TWV0YWRhdGEgJiYgdGhpcy5fYXBwbHlNZXRhZGF0YSgpXHJcbiAgICAgICAgICAgICAgICBpZiAoYXBwbHlNZXRhZGF0YSAmJiB0aGlzLnByZXZlbnRXaGl0ZVNwYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy56b29tKGZhbHNlLCAwKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmUoeyB4OiAwLCB5OiAwIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZHJhdygpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9hc3BlY3RGaWxsICgpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbWdXaWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgICAgICAgICBsZXQgaW1nSGVpZ2h0ID0gdGhpcy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICBsZXQgY2FudmFzUmF0aW8gPSB0aGlzLm91dHB1dFdpZHRoIC8gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgICAgICAgIGxldCBzY2FsZVJhdGlvXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hc3BlY3RSYXRpbyA+IGNhbnZhc1JhdGlvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGVSYXRpbyA9IGltZ0hlaWdodCAvIHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gaW1nV2lkdGggLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IC0odGhpcy5pbWdEYXRhLndpZHRoIC0gdGhpcy5vdXRwdXRXaWR0aCkgLyAyXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WSA9IDBcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGVSYXRpbyA9IGltZ1dpZHRoIC8gdGhpcy5vdXRwdXRXaWR0aFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS5oZWlnaHQgPSBpbWdIZWlnaHQgLyBzY2FsZVJhdGlvXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLndpZHRoID0gdGhpcy5vdXRwdXRXaWR0aFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSAtKHRoaXMuaW1nRGF0YS5oZWlnaHQgLSB0aGlzLm91dHB1dEhlaWdodCkgLyAyXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX2FzcGVjdEZpdCAoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW1nV2lkdGggPSB0aGlzLm5hdHVyYWxXaWR0aFxyXG4gICAgICAgICAgICAgICAgbGV0IGltZ0hlaWdodCA9IHRoaXMubmF0dXJhbEhlaWdodFxyXG4gICAgICAgICAgICAgICAgbGV0IGNhbnZhc1JhdGlvID0gdGhpcy5vdXRwdXRXaWR0aCAvIHRoaXMub3V0cHV0SGVpZ2h0XHJcbiAgICAgICAgICAgICAgICBsZXQgc2NhbGVSYXRpb1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXNwZWN0UmF0aW8gPiBjYW52YXNSYXRpbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlUmF0aW8gPSBpbWdXaWR0aCAvIHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuaGVpZ2h0ID0gaW1nSGVpZ2h0IC8gc2NhbGVSYXRpb1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS53aWR0aCA9IHRoaXMub3V0cHV0V2lkdGhcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2FsZVJhdGlvID0gaW1nSGVpZ2h0IC8gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSBpbWdXaWR0aCAvIHNjYWxlUmF0aW9cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuaGVpZ2h0ID0gdGhpcy5vdXRwdXRIZWlnaHRcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRYID0gLSh0aGlzLmltZ0RhdGEud2lkdGggLSB0aGlzLm91dHB1dFdpZHRoKSAvIDJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX25hdHVyYWxTaXplICgpIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbWdXaWR0aCA9IHRoaXMubmF0dXJhbFdpZHRoXHJcbiAgICAgICAgICAgICAgICBsZXQgaW1nSGVpZ2h0ID0gdGhpcy5uYXR1cmFsSGVpZ2h0XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEud2lkdGggPSBpbWdXaWR0aFxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLmhlaWdodCA9IGltZ0hlaWdodFxyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IC0odGhpcy5pbWdEYXRhLndpZHRoIC0gdGhpcy5vdXRwdXRXaWR0aCkgLyAyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gLSh0aGlzLmltZ0RhdGEuaGVpZ2h0IC0gdGhpcy5vdXRwdXRIZWlnaHQpIC8gMlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfaGFuZGxlUG9pbnRlclN0YXJ0IChldnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3VwcG9ydFRvdWNoID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludGVyTW92ZWQgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgbGV0IHBvaW50ZXJDb29yZCA9IHUuZ2V0UG9pbnRlckNvb3JkcyhldnQsIHRoaXMpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvaW50ZXJTdGFydENvb3JkID0gcG9pbnRlckNvb3JkXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAvLyBzaW11bGF0ZSBjbGljayB3aXRoIHRvdWNoIG9uIG1vYmlsZSBkZXZpY2VzXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSAmJiAhdGhpcy5kaXNhYmxlQ2xpY2tUb0Nob29zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFiU3RhcnQgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIG1vdXNlIHJpZ2h0IGNsaWNrIGFuZCBtaWRkbGUgY2xpY2tcclxuICAgICAgICAgICAgICAgIGlmIChldnQud2hpY2ggJiYgZXZ0LndoaWNoID4gMSkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5waW5jaGluZyA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZpbmdDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LnRvdWNoZXMgJiYgZXZ0LnRvdWNoZXMubGVuZ3RoID09PSAyICYmICF0aGlzLmRpc2FibGVQaW5jaFRvWm9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGluY2hpbmcgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5waW5jaERpc3RhbmNlID0gdS5nZXRQaW5jaERpc3RhbmNlKGV2dCwgdGhpcylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBjYW5jZWxFdmVudHMgPSBbJ21vdXNldXAnLCAndG91Y2hlbmQnLCAndG91Y2hjYW5jZWwnLCAncG9pbnRlcmVuZCcsICdwb2ludGVyY2FuY2VsJ11cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBjYW5jZWxFdmVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZSA9IGNhbmNlbEV2ZW50c1tpXVxyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoZSwgdGhpcy5faGFuZGxlUG9pbnRlckVuZClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX2hhbmRsZVBvaW50ZXJFbmQgKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvaW50ZXJNb3ZlRGlzdGFuY2UgPSAwXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyU3RhcnRDb29yZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwb2ludGVyQ29vcmQgPSB1LmdldFBvaW50ZXJDb29yZHMoZXZ0LCB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgIHBvaW50ZXJNb3ZlRGlzdGFuY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3cocG9pbnRlckNvb3JkLnggLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLngsIDIpICsgTWF0aC5wb3cocG9pbnRlckNvb3JkLnkgLSB0aGlzLnBvaW50ZXJTdGFydENvb3JkLnksIDIpKSB8fCAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzSW1hZ2UoKSAmJiAhdGhpcy5kaXNhYmxlQ2xpY2tUb0Nob29zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0YWJFbmQgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgocG9pbnRlck1vdmVEaXN0YW5jZSA8IENMSUNLX01PVkVfVEhSRVNIT0xEKSAmJiB0YWJFbmQgLSB0aGlzLnRhYlN0YXJ0IDwgTUlOX01TX1BFUl9DTElDSyAmJiB0aGlzLnN1cHBvcnRUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNob29zZUZpbGUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhYlN0YXJ0ID0gMFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnZ2luZyA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBpbmNoaW5nID0gZmFsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMucGluY2hEaXN0YW5jZSA9IDBcclxuICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gbnVsbFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludGVyTW92ZWQgPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludGVyU3RhcnRDb29yZCA9IG51bGxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX2hhbmRsZVBvaW50ZXJNb3ZlIChldnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9pbnRlck1vdmVkID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvb3JkID0gdS5nZXRQb2ludGVyQ29vcmRzKGV2dCwgdGhpcylcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFBvaW50ZXJDb29yZCA9IGNvb3JkXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCB0aGlzLmRpc2FibGVEcmFnVG9Nb3ZlKSByZXR1cm5cclxuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgICAgICAgICAgICBpZiAoIWV2dC50b3VjaGVzIHx8IGV2dC50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kcmFnZ2luZykgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdE1vdmluZ0Nvb3JkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBjb29yZC54IC0gdGhpcy5sYXN0TW92aW5nQ29vcmQueCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGNvb3JkLnkgLSB0aGlzLmxhc3RNb3ZpbmdDb29yZC55XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmluZ0Nvb3JkID0gY29vcmRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChldnQudG91Y2hlcyAmJiBldnQudG91Y2hlcy5sZW5ndGggPT09IDIgJiYgIXRoaXMuZGlzYWJsZVBpbmNoVG9ab29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnBpbmNoaW5nKSByZXR1cm5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSB1LmdldFBpbmNoRGlzdGFuY2UoZXZ0LCB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWx0YSA9IGRpc3RhbmNlIC0gdGhpcy5waW5jaERpc3RhbmNlXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy56b29tKGRlbHRhID4gMCwgUElOQ0hfQUNDRUxFUkFUSU9OKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGluY2hEaXN0YW5jZSA9IGRpc3RhbmNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9oYW5kbGVQb2ludGVyTGVhdmUgKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UG9pbnRlckNvb3JkID0gbnVsbFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfaGFuZGxlV2hlZWwgKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlU2Nyb2xsVG9ab29tIHx8ICF0aGlzLmhhc0ltYWdlKCkpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsaW5nID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgaWYgKGV2dC53aGVlbERlbHRhIDwgMCB8fCBldnQuZGVsdGFZID4gMCB8fCBldnQuZGV0YWlsID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbSh0aGlzLnJldmVyc2VTY3JvbGxUb1pvb20pXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV2dC53aGVlbERlbHRhID4gMCB8fCBldnQuZGVsdGFZIDwgMCB8fCBldnQuZGV0YWlsIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbSghdGhpcy5yZXZlcnNlU2Nyb2xsVG9ab29tKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbmV4dFRpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsaW5nID0gZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9oYW5kbGVEcmFnRW50ZXIgKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgdGhpcy5kaXNhYmxlRHJhZ0FuZERyb3AgfHwgdGhpcy5oYXNJbWFnZSgpIHx8ICF1LmV2ZW50SGFzRmlsZShldnQpKSByZXR1cm5cclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZURyYWdnZWRPdmVyID0gdHJ1ZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfaGFuZGxlRHJhZ0xlYXZlIChldnQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5maWxlRHJhZ2dlZE92ZXIgfHwgIXUuZXZlbnRIYXNGaWxlKGV2dCkpIHJldHVyblxyXG4gICAgICAgICAgICAgICAgdGhpcy5maWxlRHJhZ2dlZE92ZXIgPSBmYWxzZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfaGFuZGxlRHJhZ092ZXIgKGV2dCkge1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfaGFuZGxlRHJvcCAoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZmlsZURyYWdnZWRPdmVyIHx8ICF1LmV2ZW50SGFzRmlsZShldnQpKSByZXR1cm5cclxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZURyYWdnZWRPdmVyID0gZmFsc2VcclxuICAgICAgICAgICAgICAgIGxldCBmaWxlXHJcbiAgICAgICAgICAgICAgICBsZXQgZHQgPSBldnQuZGF0YVRyYW5zZmVyXHJcbiAgICAgICAgICAgICAgICBpZiAoIWR0KSByZXR1cm5cclxuICAgICAgICAgICAgICAgIGlmIChkdC5pdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBkdC5pdGVtcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IGR0Lml0ZW1zW2ldXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmtpbmQgPT0gJ2ZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlID0gaXRlbS5nZXRBc0ZpbGUoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZSA9IGR0LmZpbGVzWzBdXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uTmV3RmlsZUluKGZpbGUpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9wcmV2ZW50TW92aW5nVG9XaGl0ZVNwYWNlICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltZ0RhdGEuc3RhcnRYID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFggPSAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbWdEYXRhLnN0YXJ0WSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltZ0RhdGEuc3RhcnRZID0gMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3V0cHV0V2lkdGggLSB0aGlzLmltZ0RhdGEuc3RhcnRYID4gdGhpcy5pbWdEYXRhLndpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IC0odGhpcy5pbWdEYXRhLndpZHRoIC0gdGhpcy5vdXRwdXRXaWR0aClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm91dHB1dEhlaWdodCAtIHRoaXMuaW1nRGF0YS5zdGFydFkgPiB0aGlzLmltZ0RhdGEuaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WSA9IC0odGhpcy5pbWdEYXRhLmhlaWdodCAtIHRoaXMub3V0cHV0SGVpZ2h0KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfcHJldmVudFpvb21pbmdUb1doaXRlU3BhY2UgKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1nRGF0YS53aWR0aCA8IHRoaXMub3V0cHV0V2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB0aGlzLm91dHB1dFdpZHRoIC8gdGhpcy5uYXR1cmFsV2lkdGhcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltZ0RhdGEuaGVpZ2h0IDwgdGhpcy5vdXRwdXRIZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjYWxlUmF0aW8gPSB0aGlzLm91dHB1dEhlaWdodCAvIHRoaXMubmF0dXJhbEhlaWdodFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfc2V0T3JpZW50YXRpb24gKG9yaWVudGF0aW9uID0gNiwgYXBwbHlNZXRhZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB2YXIgdXNlT3JpZ2luYWwgPSBhcHBseU1ldGFkYXRhICYmIHRoaXMudXNlck1ldGFkYXRhLm9yaWVudGF0aW9uICE9PSB0aGlzLm9yaWVudGF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPiAxIHx8IHVzZU9yaWdpbmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9pbWcgPSB1LmdldFJvdGF0ZWRJbWFnZSh1c2VPcmlnaW5hbCA/IHRoaXMub3JpZ2luYWxJbWFnZSA6IHRoaXMuaW1nLCBvcmllbnRhdGlvbilcclxuICAgICAgICAgICAgICAgICAgICBfaW1nLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWcgPSBfaW1nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BsYWNlSW1hZ2UoYXBwbHlNZXRhZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BsYWNlSW1hZ2UoYXBwbHlNZXRhZGF0YSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChvcmllbnRhdGlvbiA9PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmxpcCB4XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IHUuZmxpcFgodGhpcy5vcmllbnRhdGlvbilcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3JpZW50YXRpb24gPT0gNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZsaXAgeVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSB1LmZsaXBZKHRoaXMub3JpZW50YXRpb24pXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9yaWVudGF0aW9uID09IDYpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyA5MCBkZWdcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gdS5yb3RhdGU5MCh0aGlzLm9yaWVudGF0aW9uKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcmllbnRhdGlvbiA9PSAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gMTgwIGRlZ1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZW50YXRpb24gPSB1LnJvdGF0ZTkwKHUucm90YXRlOTAodGhpcy5vcmllbnRhdGlvbikpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9yaWVudGF0aW9uID09IDgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAyNzAgZGVnXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IHUucm90YXRlOTAodS5yb3RhdGU5MCh1LnJvdGF0ZTkwKHRoaXMub3JpZW50YXRpb24pKSlcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcmllbnRhdGlvbiA9IG9yaWVudGF0aW9uXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodXNlT3JpZ2luYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gb3JpZW50YXRpb25cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX3BhaW50QmFja2dyb3VuZCAoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFja2dyb3VuZENvbG9yID0gKCF0aGlzLmNhbnZhc0NvbG9yIHx8IHRoaXMuY2FudmFzQ29sb3IgPT0gJ2RlZmF1bHQnKSA/ICd0cmFuc3BhcmVudCcgOiB0aGlzLmNhbnZhc0NvbG9yXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN0eC5maWxsU3R5bGUgPSBiYWNrZ3JvdW5kQ29sb3JcclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLm91dHB1dFdpZHRoLCB0aGlzLm91dHB1dEhlaWdodClcclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMub3V0cHV0V2lkdGgsIHRoaXMub3V0cHV0SGVpZ2h0KVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfZHJhdyAoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRuZXh0VGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmltZykgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2RyYXdGcmFtZSlcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9kcmF3RnJhbWUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF9kcmF3RnJhbWUgKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGN0eCA9IHRoaXMuY3R4XHJcbiAgICAgICAgICAgICAgICBsZXQgeyBzdGFydFgsIHN0YXJ0WSwgd2lkdGgsIGhlaWdodCB9ID0gdGhpcy5pbWdEYXRhXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wYWludEJhY2tncm91bmQoKVxyXG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLmltZywgc3RhcnRYLCBzdGFydFksIHdpZHRoLCBoZWlnaHQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbWl0KGV2ZW50cy5EUkFXLCBjdHgpXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaW1hZ2VTZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmltYWdlU2V0ID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVtaXQoZXZlbnRzLk5FV19JTUFHRV9EUkFXTilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgX2FwcGx5TWV0YWRhdGEgKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVzZXJNZXRhZGF0YSkgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB2YXIgeyBzdGFydFgsIHN0YXJ0WSwgc2NhbGUgfSA9IHRoaXMudXNlck1ldGFkYXRhXHJcbiAgICAgICAgICAgICAgICBpZiAodS5udW1iZXJWYWxpZChzdGFydFgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbWdEYXRhLnN0YXJ0WCA9IHN0YXJ0WFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHUubnVtYmVyVmFsaWQoc3RhcnRZKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW1nRGF0YS5zdGFydFkgPSBzdGFydFlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh1Lm51bWJlclZhbGlkKHNjYWxlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NhbGVSYXRpbyA9IHNjYWxlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRuZXh0VGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VyTWV0YWRhdGEgPSBudWxsXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG48L3NjcmlwdD5cclxuXHJcbjxzdHlsZSBsYW5nPVwic3R5bHVzXCI+XHJcbiAgLmNyb3BwYS1jb250YWluZXJcclxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9ja1xyXG4gICAgY3Vyc29yOiBwb2ludGVyXHJcbiAgICB0cmFuc2l0aW9uOiBhbGwgLjNzXHJcbiAgICBwb3NpdGlvbjogcmVsYXRpdmVcclxuICAgIGZvbnQtc2l6ZTogMFxyXG4gICAgYWxpZ24tc2VsZjogZmxleC1zdGFydFxyXG4gICAgYmFja2dyb3VuZC1jb2xvcjogI2U2ZTZlNlxyXG4gICAgY2FudmFzXHJcbiAgICAgIHRyYW5zaXRpb246IGFsbCAuM3NcclxuICAgICY6aG92ZXJcclxuICAgICAgb3BhY2l0eTogLjdcclxuICAgICYuY3JvcHBhLS1kcm9wem9uZVxyXG4gICAgICBib3gtc2hhZG93OiBpbnNldCAwIDAgMTBweCBsaWdodG5lc3MoYmxhY2ssIDIwJSlcclxuICAgICAgY2FudmFzXHJcbiAgICAgICAgb3BhY2l0eTogLjVcclxuICAgICYuY3JvcHBhLS1kaXNhYmxlZC1jY1xyXG4gICAgICBjdXJzb3I6IGRlZmF1bHRcclxuICAgICAgJjpob3ZlclxyXG4gICAgICAgIG9wYWNpdHk6IDFcclxuICAgICYuY3JvcHBhLS1oYXMtdGFyZ2V0XHJcbiAgICAgIGN1cnNvcjogbW92ZVxyXG4gICAgICAmOmhvdmVyXHJcbiAgICAgICAgb3BhY2l0eTogMVxyXG4gICAgICAmLmNyb3BwYS0tZGlzYWJsZWQtbXpcclxuICAgICAgICBjdXJzb3I6IGRlZmF1bHRcclxuICAgICYuY3JvcHBhLS1kaXNhYmxlZFxyXG4gICAgICBjdXJzb3I6IG5vdC1hbGxvd2VkXHJcbiAgICAgICY6aG92ZXJcclxuICAgICAgICBvcGFjaXR5OiAxXHJcbiAgICBzdmcuaWNvbi1yZW1vdmVcclxuICAgICAgcG9zaXRpb246IGFic29sdXRlXHJcbiAgICAgIGJhY2tncm91bmQ6IHdoaXRlXHJcbiAgICAgIGJvcmRlci1yYWRpdXM6IDUwJVxyXG4gICAgICBmaWx0ZXI6IGRyb3Atc2hhZG93KC0ycHggMnB4IDJweCByZ2JhKDAsIDAsIDAsIDAuNykpXHJcbiAgICAgIHotaW5kZXg6IDEwXHJcbiAgICAgIGN1cnNvcjogcG9pbnRlclxyXG4gICAgICBib3JkZXI6IDJweCBzb2xpZCB3aGl0ZVxyXG48L3N0eWxlPiIsIi8qXG5vYmplY3QtYXNzaWduXG4oYykgU2luZHJlIFNvcmh1c1xuQGxpY2Vuc2UgTUlUXG4qL1xuXG4ndXNlIHN0cmljdCc7XG4vKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xudmFyIGdldE93blByb3BlcnR5U3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFVzZU5hdGl2ZSgpIHtcblx0dHJ5IHtcblx0XHRpZiAoIU9iamVjdC5hc3NpZ24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBEZXRlY3QgYnVnZ3kgcHJvcGVydHkgZW51bWVyYXRpb24gb3JkZXIgaW4gb2xkZXIgVjggdmVyc2lvbnMuXG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTE4XG5cdFx0dmFyIHRlc3QxID0gbmV3IFN0cmluZygnYWJjJyk7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLW5ldy13cmFwcGVyc1xuXHRcdHRlc3QxWzVdID0gJ2RlJztcblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDEpWzBdID09PSAnNScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QyID0ge307XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG5cdFx0XHR0ZXN0MlsnXycgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpXSA9IGk7XG5cdFx0fVxuXHRcdHZhciBvcmRlcjIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MikubWFwKGZ1bmN0aW9uIChuKSB7XG5cdFx0XHRyZXR1cm4gdGVzdDJbbl07XG5cdFx0fSk7XG5cdFx0aWYgKG9yZGVyMi5qb2luKCcnKSAhPT0gJzAxMjM0NTY3ODknKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MyA9IHt9O1xuXHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlcikge1xuXHRcdFx0dGVzdDNbbGV0dGVyXSA9IGxldHRlcjtcblx0XHR9KTtcblx0XHRpZiAoT2JqZWN0LmtleXMoT2JqZWN0LmFzc2lnbih7fSwgdGVzdDMpKS5qb2luKCcnKSAhPT1cblx0XHRcdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHQvLyBXZSBkb24ndCBleHBlY3QgYW55IG9mIHRoZSBhYm92ZSB0byB0aHJvdywgYnV0IGJldHRlciB0byBiZSBzYWZlLlxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNob3VsZFVzZU5hdGl2ZSgpID8gT2JqZWN0LmFzc2lnbiA6IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChnZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcblx0XHRcdHN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iLCJpbXBvcnQgY29tcG9uZW50IGZyb20gJy4vY3JvcHBlci52dWUnXHJcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbidcclxuXHJcbmNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xyXG4gIGNvbXBvbmVudE5hbWU6ICdjcm9wcGEnXHJcbn1cclxuXHJcbmNvbnN0IFZ1ZUNyb3BwYSA9IHtcclxuICBpbnN0YWxsOiBmdW5jdGlvbiAoVnVlLCBvcHRpb25zKSB7XHJcbiAgICBvcHRpb25zID0gYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucylcclxuICAgIGxldCB2ZXJzaW9uID0gTnVtYmVyKFZ1ZS52ZXJzaW9uLnNwbGl0KCcuJylbMF0pXHJcbiAgICBpZiAodmVyc2lvbiA8IDIpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB2dWUtY3JvcHBhIHN1cHBvcnRzIHZ1ZSB2ZXJzaW9uIDIuMCBhbmQgYWJvdmUuIFlvdSBhcmUgdXNpbmcgVnVlQCR7dmVyc2lvbn0uIFBsZWFzZSB1cGdyYWRlIHRvIHRoZSBsYXRlc3QgdmVyc2lvbiBvZiBWdWUuYClcclxuICAgIH1cclxuICAgIGxldCBjb21wb25lbnROYW1lID0gb3B0aW9ucy5jb21wb25lbnROYW1lIHx8ICdjcm9wcGEnXHJcblxyXG4gICAgLy8gcmVnaXN0cmF0aW9uXHJcbiAgICBWdWUuY29tcG9uZW50KGNvbXBvbmVudE5hbWUsIGNvbXBvbmVudClcclxuICB9LFxyXG5cclxuICBjb21wb25lbnRcclxufVxyXG5leHBvcnQgZGVmYXVsdCBWdWVDcm9wcGEiXSwibmFtZXMiOlsicG9pbnQiLCJ2bSIsImNhbnZhcyIsInF1YWxpdHkiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwiY2xpZW50WCIsImNsaWVudFkiLCJsZWZ0IiwidG9wIiwiZXZ0IiwicG9pbnRlciIsInRvdWNoZXMiLCJjaGFuZ2VkVG91Y2hlcyIsIm9uZVBvaW50Q29vcmQiLCJwb2ludGVyMSIsInBvaW50ZXIyIiwiY29vcmQxIiwiY29vcmQyIiwiTWF0aCIsInNxcnQiLCJwb3ciLCJ4IiwieSIsImltZyIsImNvbXBsZXRlIiwibmF0dXJhbFdpZHRoIiwiZG9jdW1lbnQiLCJ3aW5kb3ciLCJsYXN0VGltZSIsInZlbmRvcnMiLCJsZW5ndGgiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsImNhbGxiYWNrIiwiY3VyclRpbWUiLCJEYXRlIiwiZ2V0VGltZSIsInRpbWVUb0NhbGwiLCJtYXgiLCJpZCIsInNldFRpbWVvdXQiLCJhcmciLCJpc0FycmF5IiwiT2JqZWN0IiwicHJvdG90eXBlIiwidG9TdHJpbmciLCJjYWxsIiwiSFRNTENhbnZhc0VsZW1lbnQiLCJiaW5TdHIiLCJsZW4iLCJhcnIiLCJ0b0Jsb2IiLCJkZWZpbmVQcm9wZXJ0eSIsInR5cGUiLCJhdG9iIiwidG9EYXRhVVJMIiwic3BsaXQiLCJVaW50OEFycmF5IiwiaSIsImNoYXJDb2RlQXQiLCJCbG9iIiwiZHQiLCJkYXRhVHJhbnNmZXIiLCJvcmlnaW5hbEV2ZW50IiwidHlwZXMiLCJhcnJheUJ1ZmZlciIsInZpZXciLCJEYXRhVmlldyIsImdldFVpbnQxNiIsImJ5dGVMZW5ndGgiLCJvZmZzZXQiLCJtYXJrZXIiLCJnZXRVaW50MzIiLCJsaXR0bGUiLCJ0YWdzIiwiYmFzZTY0IiwicmVwbGFjZSIsImJpbmFyeVN0cmluZyIsImJ5dGVzIiwiYnVmZmVyIiwib3JpZW50YXRpb24iLCJfY2FudmFzIiwiQ2FudmFzRXhpZk9yaWVudGF0aW9uIiwiZHJhd0ltYWdlIiwiX2ltZyIsIkltYWdlIiwic3JjIiwib3JpIiwibWFwIiwibiIsImlzTmFOIiwiTnVtYmVyIiwiaXNJbnRlZ2VyIiwidmFsdWUiLCJpc0Zpbml0ZSIsImZsb29yIiwiaW5pdGlhbEltYWdlVHlwZSIsIlN0cmluZyIsInZhbCIsIkJvb2xlYW4iLCJ2YWxpZHMiLCJldmVyeSIsImluZGV4T2YiLCJ3b3JkIiwidGVzdCIsIlBDVF9QRVJfWk9PTSIsIk1JTl9NU19QRVJfQ0xJQ0siLCJDTElDS19NT1ZFX1RIUkVTSE9MRCIsIk1JTl9XSURUSCIsIkRFRkFVTFRfUExBQ0VIT0xERVJfVEFLRVVQIiwiUElOQ0hfQUNDRUxFUkFUSU9OIiwicmVuZGVyIiwiZXZlbnRzIiwiSU5JVF9FVkVOVCIsInByb3BzIiwid2lkdGgiLCJoZWlnaHQiLCJwbGFjZWhvbGRlckZvbnRTaXplIiwibmF0dXJhbEhlaWdodCIsIl9pbml0IiwickFGUG9seWZpbGwiLCJ0b0Jsb2JQb2x5ZmlsbCIsInN1cHBvcnRzIiwic3VwcG9ydERldGVjdGlvbiIsImJhc2ljIiwid2FybiIsImhhc0ltYWdlIiwicHJldmVudFdoaXRlU3BhY2UiLCJpbWFnZVNldCIsIl9zZXRTaXplIiwiX3BsYWNlSW1hZ2UiLCJfZHJhdyIsIm9sZFZhbCIsInUiLCJudW1iZXJWYWxpZCIsInBvcyIsImN1cnJlbnRQb2ludGVyQ29vcmQiLCJpbWdEYXRhIiwic3RhcnRYIiwic3RhcnRZIiwiX3ByZXZlbnRab29taW5nVG9XaGl0ZVNwYWNlIiwidXNlck1ldGFkYXRhIiwibG9nIiwib2Zmc2V0WCIsIm9mZnNldFkiLCJzY2FsZVJhdGlvIiwiYWJzIiwiJGVtaXQiLCJaT09NX0VWRU5UIiwiY3R4IiwiJHJlZnMiLCJmaWxlSW5wdXQiLCJmaWxlcyIsIm9sZFgiLCJvbGRZIiwiX3ByZXZlbnRNb3ZpbmdUb1doaXRlU3BhY2UiLCJNT1ZFX0VWRU5UIiwiYW1vdW50IiwibW92ZSIsInpvb21JbiIsImFjY2VsZXJhdGlvbiIsInJlYWxTcGVlZCIsInpvb21TcGVlZCIsInNwZWVkIiwib3V0cHV0V2lkdGgiLCJ6b29tIiwic3RlcCIsImRpc2FibGVSb3RhdGlvbiIsImRpc2FibGVkIiwicGFyc2VJbnQiLCJfcm90YXRlQnlTdGVwIiwicm90YXRlRGVncmVlcyIsImRlZ3JlZXMiLCJjbGVhclJlY3QiLCJ0cmFuc2xhdGUiLCJyb3RhdGUiLCJQSSIsInBhaW50QmFja2dyb3VuZCIsImRyYXciLCJST1RBVEVfRVZFTlQiLCJfc2V0T3JpZW50YXRpb24iLCIkbmV4dFRpY2siLCJtZXRhZGF0YSIsImNvbXByZXNzaW9uUmF0ZSIsIm1pbWVUeXBlIiwicXVhbGl0eUFyZ3VtZW50IiwiYXJncyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiZ2VuZXJhdGVCbG9iIiwiYmxvYiIsImVyciIsImRpdiIsImNyZWF0ZUVsZW1lbnQiLCJGaWxlIiwiRmlsZVJlYWRlciIsIkZpbGVMaXN0IiwiY2xpY2siLCJfcGFpbnRCYWNrZ3JvdW5kIiwiX3NldEltYWdlUGxhY2Vob2xkZXIiLCJ0ZXh0QmFzZWxpbmUiLCJ0ZXh0QWxpZ24iLCJkZWZhdWx0Rm9udFNpemUiLCJwbGFjZWhvbGRlciIsImZvbnRTaXplIiwiY29tcHV0ZWRQbGFjZWhvbGRlckZvbnRTaXplIiwiZm9udCIsImZpbGxTdHlsZSIsInBsYWNlaG9sZGVyQ29sb3IiLCJmaWxsVGV4dCIsIm91dHB1dEhlaWdodCIsImhhZEltYWdlIiwib3JpZ2luYWxJbWFnZSIsIklNQUdFX1JFTU9WRV9FVkVOVCIsInN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiY2FudmFzQ29sb3IiLCJnZXRDb250ZXh0IiwiX3NldEluaXRpYWwiLCIkc2xvdHMiLCJ2Tm9kZSIsInRhZyIsImVsbSIsIm9uTG9hZCIsImltYWdlTG9hZGVkIiwib25sb2FkIiwiaW5pdGlhbCIsImluaXRpYWxJbWFnZSIsInNldEF0dHJpYnV0ZSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJyZW1vdmUiLCJJTklUSUFMX0lNQUdFX0xPQURFRF9FVkVOVCIsIl9vbmxvYWQiLCJkYXRhc2V0Iiwib25lcnJvciIsImRpc2FibGVDbGlja1RvQ2hvb3NlIiwic3VwcG9ydFRvdWNoIiwiY2hvb3NlRmlsZSIsImlucHV0IiwiZmlsZSIsIl9vbk5ld0ZpbGVJbiIsIkZJTEVfQ0hPT1NFX0VWRU5UIiwiX2ZpbGVTaXplSXNWYWxpZCIsIkZJTEVfU0laRV9FWENFRURfRVZFTlQiLCJFcnJvciIsImZpbGVTaXplTGltaXQiLCJfZmlsZVR5cGVJc1ZhbGlkIiwiRklMRV9UWVBFX01JU01BVENIX0VWRU5UIiwibmFtZSIsInRvTG93ZXJDYXNlIiwicG9wIiwiYWNjZXB0IiwiZnIiLCJlIiwiZmlsZURhdGEiLCJ0YXJnZXQiLCJyZXN1bHQiLCJnZXRGaWxlT3JpZW50YXRpb24iLCJiYXNlNjRUb0FycmF5QnVmZmVyIiwiTkVXX0lNQUdFIiwicmVhZEFzRGF0YVVSTCIsInNpemUiLCJhY2NlcGN0IiwiYmFzZU1pbWV0eXBlIiwidCIsInRyaW0iLCJjaGFyQXQiLCJzbGljZSIsImZpbGVCYXNlVHlwZSIsImFwcGx5TWV0YWRhdGEiLCJfYXNwZWN0RmlsbCIsImluaXRpYWxTaXplIiwiX2FzcGVjdEZpdCIsIl9uYXR1cmFsU2l6ZSIsImluaXRpYWxQb3NpdGlvbiIsImV4ZWMiLCJfYXBwbHlNZXRhZGF0YSIsImltZ1dpZHRoIiwiaW1nSGVpZ2h0IiwiY2FudmFzUmF0aW8iLCJhc3BlY3RSYXRpbyIsInBvaW50ZXJNb3ZlZCIsInBvaW50ZXJDb29yZCIsImdldFBvaW50ZXJDb29yZHMiLCJwb2ludGVyU3RhcnRDb29yZCIsInRhYlN0YXJ0IiwidmFsdWVPZiIsIndoaWNoIiwiZHJhZ2dpbmciLCJwaW5jaGluZyIsImNvb3JkIiwibGFzdE1vdmluZ0Nvb3JkIiwiZGlzYWJsZVBpbmNoVG9ab29tIiwicGluY2hEaXN0YW5jZSIsImdldFBpbmNoRGlzdGFuY2UiLCJjYW5jZWxFdmVudHMiLCJhZGRFdmVudExpc3RlbmVyIiwiX2hhbmRsZVBvaW50ZXJFbmQiLCJwb2ludGVyTW92ZURpc3RhbmNlIiwidGFiRW5kIiwiZGlzYWJsZURyYWdUb01vdmUiLCJwcmV2ZW50RGVmYXVsdCIsImRpc3RhbmNlIiwiZGVsdGEiLCJkaXNhYmxlU2Nyb2xsVG9ab29tIiwic2Nyb2xsaW5nIiwid2hlZWxEZWx0YSIsImRlbHRhWSIsImRldGFpbCIsInJldmVyc2VTY3JvbGxUb1pvb20iLCJkaXNhYmxlRHJhZ0FuZERyb3AiLCJldmVudEhhc0ZpbGUiLCJmaWxlRHJhZ2dlZE92ZXIiLCJpdGVtcyIsIml0ZW0iLCJraW5kIiwiZ2V0QXNGaWxlIiwidXNlT3JpZ2luYWwiLCJnZXRSb3RhdGVkSW1hZ2UiLCJmbGlwWCIsImZsaXBZIiwicm90YXRlOTAiLCJmaWxsUmVjdCIsIl9kcmF3RnJhbWUiLCJEUkFXIiwiTkVXX0lNQUdFX0RSQVdOIiwic2NhbGUiLCJkZWZhdWx0T3B0aW9ucyIsIlZ1ZUNyb3BwYSIsIlZ1ZSIsIm9wdGlvbnMiLCJhc3NpZ24iLCJ2ZXJzaW9uIiwiY29tcG9uZW50TmFtZSIsImNvbXBvbmVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLFFBQWU7ZUFBQSx5QkFDRUEsS0FERixFQUNTQyxFQURULEVBQ2E7UUFDbEJDLE1BRGtCLEdBQ0VELEVBREYsQ0FDbEJDLE1BRGtCO1FBQ1ZDLE9BRFUsR0FDRUYsRUFERixDQUNWRSxPQURVOztRQUVwQkMsT0FBT0YsT0FBT0cscUJBQVAsRUFBWDtRQUNJQyxVQUFVTixNQUFNTSxPQUFwQjtRQUNJQyxVQUFVUCxNQUFNTyxPQUFwQjtXQUNPO1NBQ0YsQ0FBQ0QsVUFBVUYsS0FBS0ksSUFBaEIsSUFBd0JMLE9BRHRCO1NBRUYsQ0FBQ0ksVUFBVUgsS0FBS0ssR0FBaEIsSUFBdUJOO0tBRjVCO0dBTlc7a0JBQUEsNEJBWUtPLEdBWkwsRUFZVVQsRUFaVixFQVljO1FBQ3JCVSxnQkFBSjtRQUNJRCxJQUFJRSxPQUFKLElBQWVGLElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQW5CLEVBQW1DO2dCQUN2QkYsSUFBSUUsT0FBSixDQUFZLENBQVosQ0FBVjtLQURGLE1BRU8sSUFBSUYsSUFBSUcsY0FBSixJQUFzQkgsSUFBSUcsY0FBSixDQUFtQixDQUFuQixDQUExQixFQUFpRDtnQkFDNUNILElBQUlHLGNBQUosQ0FBbUIsQ0FBbkIsQ0FBVjtLQURLLE1BRUE7Z0JBQ0tILEdBQVY7O1dBRUssS0FBS0ksYUFBTCxDQUFtQkgsT0FBbkIsRUFBNEJWLEVBQTVCLENBQVA7R0FyQlc7a0JBQUEsNEJBd0JLUyxHQXhCTCxFQXdCVVQsRUF4QlYsRUF3QmM7UUFDckJjLFdBQVdMLElBQUlFLE9BQUosQ0FBWSxDQUFaLENBQWY7UUFDSUksV0FBV04sSUFBSUUsT0FBSixDQUFZLENBQVosQ0FBZjtRQUNJSyxTQUFTLEtBQUtILGFBQUwsQ0FBbUJDLFFBQW5CLEVBQTZCZCxFQUE3QixDQUFiO1FBQ0lpQixTQUFTLEtBQUtKLGFBQUwsQ0FB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
