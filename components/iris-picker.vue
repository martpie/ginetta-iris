<template>
  <div class="iris">
    <div class="iris__toolbar">
      <div class="form-control">
        <label for="iris-form-preset">
          Preset
        </label>
        <select
          id="iris-form-preset"
          class="input-control"
          @input="changePreset"
        >
          <option value="16:9">Slide / Wallpaper</option>
          <option value="1.545:1">Business card (Europe)</option>
        </select>
      </div>
      <div class="form-control">
        <label for="iris-form-aspectratio">
          Aspect ratio
        </label>
        <input
          id="iris-form-aspectratio"
          v-model="options.aspectRatio"
          class="input-control"
          type="text"
        >
      </div>
    </div>
    <div class="iris__frame">
      <canvas
        ref="mainFrame"
        :width="frame.width"
        :height="frame.height"
        :class="{ 'iris__frame__canvas': true, '-is-loaded': loaded }"
        :style="{ transform: `scale3d(${frame.scale}, ${frame.scale}, 1) translate3d(${frame.translate.x}px, ${frame.translate.y}px, 0)` }"
        @wheel="frameScale"
        @pointermove="frameTranslate"
        @pointerdown="enableTranslate"
        @pointerup="disableTranslate"
        @pointerleave="disableTranslate"
        @pointercancel="disableTranslate"
        @pointerout="disableTranslate"
      />
    </div>
  </div>
</template>

<script>
import { getCanvasMaxDimensions } from '../utils/canvas';

const MAX_SCALE = 25;
const MIN_SCALE = 0.25;

let isPointerDown = false;
let initialCoordinates = {
  x: null,
  y: null
};

let iris;

export default {
  data() {
    return {
      loaded: false,
      frame: {
        width: 0,
        height: 0,
        scale: 1,
        translate: {
          x: 0,
          y: 0
        }
      },
      options: {
        aspectRatio: '16:9'
      }
    }
  },
  mounted() {
    iris = new Image();
    const mainFrame = this.$refs.mainFrame;
    const context = mainFrame.getContext('2d');

    iris.onload = () => {
      const { width, height } = getCanvasMaxDimensions(iris.width, iris.height);

      this.frame.width = width;
      this.frame.height = height;

      setTimeout(() => {
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        context.drawImage(iris, 0, 0, iris.width, iris.height, 0, 0, width, height);

        this.loaded = true;
      }, 200);

    };

    iris.onerror = (e) => {
      console.error('Failed loading the iris');
    };

    iris.src = '/iris.png';
  },
  methods: {
    changePreset(e) {
      this.options.aspectRatio = e.currentTarget.value;
    },
    frameScale(e) {
      const deltaY = e.deltaY;

      // Scale the canvas
      this.frame.scale = Math.max(Math.min(this.frame.scale + (deltaY / 100), MAX_SCALE), MIN_SCALE);

      // We need to fake we're zzoming on a point
    },
    enableTranslate(e) {
      isPointerDown = true;

      initialCoordinates = {
        x: e.clientX,
        y: e.clientY
      }
    },
    disableTranslate() {
      console.log('DISABLE');
      isPointerDown = false;
    },
    frameTranslate(e) {
      if (isPointerDown) {
        this.frame.translate.x += (e.clientX - initialCoordinates.x) / this.frame.scale;
        this.frame.translate.y += (e.clientY - initialCoordinates.y) / this.frame.scale;

        initialCoordinates = {
          x: e.clientX,
          y: e.clientY
        }
      }
    }
  }
}
</script>

<style lang="scss">
.iris {
  height: 100vh;
  width: 100vw;
  overflow: auto;
  position: relative;
  display: flex;
}

.iris__toolbar {
  width: 250px;
  background-color: white;
  padding: 20px;
  flex: 0 0 auto;
  box-shadow: 0 0 5px rgba(0, 0, 0, .5);
  z-index: 1;
}

.iris__frame {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #005577;
}

.iris__frame__canvas {
  background: white;
  max-width: 100%;
  max-height: 100%;
  background-color: black;
  opacity: 0;
  transition: opacity ease-in-out .4s;
  cursor: crosshair;

  &.-is-loaded {
    opacity: 1;
  }
}

.iris__overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  background: rgba(0, 0, 0, .5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.form-control {
  margin-bottom: 1rem;

  label {
    font-size: .875rem;
    margin-bottom: .5rem;
    display: block;
  }
}

.input-control {
  padding: 8px 12px;
  display: block;
  width: 100%;
}
</style>
