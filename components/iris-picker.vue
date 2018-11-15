<template>
  <div class="iris">
    <div class="iris__toolbar">
      <div class="iris__toolbar__options">
        <div class="form-control">
          <label for="iris-form-preset">
            Preset
          </label>
          <select
            id="iris-form-preset"
            v-model="options.aspectRatio"
            class="input-control"
            @input="refresh"
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
            @input="refresh"
          >
        </div>
        <div class="form-control">
          <label for="iris-form-portraitmode">
            <input
              id="iris-form-portraitmode"
              v-model="options.portraitMode"
              class="checkbox-control"
              type="checkbox"
            >
            Portrait mode
          </label>
        </div>
        <div class="form-control">
          <label for="iris-form-icon">
            <input
              id="iris-form-icon"
              v-model="options.icon"
              class="checkbox-control"
              type="checkbox"
              @click="refresh"
            >
            Include the little guy
          </label>
        </div>
        <div class="form-control">
          <button
            class="snap"
            @click="snap"
          >
            Snap!
          </button>
        </div>
      </div>
      <div class="iris__toolbar__about">
        <div class="form-control">
          <label for="iris-form-aspectratio">
            Share your config
          </label>
          <input
            value="19:6:255:573"
            class="input-control"
            type="text"
            @focus="selectText"
          >
        </div>
        <div class="about">
          <small>finished in a rush by <a href="https://martpie.io">this guy</a></small>
        </div>
      </div>
    </div>
    <div
      ref="mainFrameContainer"
      class="iris__frame"
    >
      <canvas
        ref="mainFrame"
        :width="frame.width"
        :height="frame.height"
        :class="{
          'iris__frame__canvas': true,
          '-is-loaded': loaded,
          '-is-dragging': dragging
        }"
        @pointerdown="dragging = true"
        @pointerup="dragging = false"
        @pointerleave="dragging = false"
        @pointercancel="dragging = false"
        @pointerout="dragging = false"
      />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import d3zoom from 'd3-zoom';
import FileSaver from 'file-saver';

import { getCanvasMaxDimensions } from '../utils/canvas';

const INITIAL_SCALE = 0.6;
const MAX_SCALE = 20;
const MIN_SCALE = 0.25;

let isPointerDown = false;
let animationFrame = 0;
let initialCoordinates = {
  x: null,
  y: null
};

let iris;
let irisCanvas;
let icon;

export default {
  data() {
    return {
      loaded: false,
      dragging: false,
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
        aspectRatio: '16:9',
        icon: false,
        portraitMode: false
      }
    }
  },
  mounted() {
    const _self = this;

    iris = new Image();
    icon = new Image();

    // Pre-render Iris in a canvas
    irisCanvas = document.createElement('canvas');

    const canvas = this.$refs.mainFrame;
    const context = canvas.getContext('2d');
    const d3canvas = d3.select(canvas);

    window.addEventListener('resize', this.refresh, { passive: true });

    iris.onload = () => {
      // Using a canvas to draw the iris in the main frame boosts perforamces in Chrome
      const { width: irisCanvasWidth, height: irisCanvasHeight } = getCanvasMaxDimensions(iris.width, iris.height);
      irisCanvas.width = irisCanvasWidth;
      irisCanvas.height = irisCanvasHeight;
      irisCanvas.getContext('2d').drawImage(iris, 0, 0, irisCanvas.width, irisCanvas.width);

      // Looks like reactivity is not instantaneous
      setTimeout(() => {
        d3canvas.call(d3.zoom()
          .scaleExtent([MIN_SCALE, MAX_SCALE])
          .on("zoom", this.zoomed));

        this.refresh();
        this.loaded = true;
      }, 0);
    };

    iris.onerror = (e) => {
      console.error('Failed loading the iris');
    };

    icon.src = '/icon.svg';
    iris.src = '/iris.png';
  },
  methods: {
    refreshFrameDimensions() {
      const { offsetWidth, offsetHeight } = this.$refs.mainFrameContainer;

      this.frame.width = offsetWidth;
      this.frame.height = offsetHeight;
    },
    selectText(e) {
      e.currentTarget.select();
    },
    snap() {
      const canvas = this.$refs.mainFrame;

      canvas.toBlob((blob) => {
        FileSaver.saveAs(blob, 'iris-snap.png');
      });
    },
    /**
     * Canvas drawing functions
     */
    zoomed() {
      this.frame.scale = d3.event.transform.k;
      this.frame.translate.x = d3.event.transform.x;
      this.frame.translate.y = d3.event.transform.y;

      this.refresh();
    },
    refresh() {
      const context = this.$refs.mainFrame.getContext('2d');

      this.refreshFrameDimensions();

      window.requestAnimationFrame(() => {
        this.drawBackground();

        context.save();
        context.translate(this.frame.translate.x, this.frame.translate.y); // important: do the translation before the scaline
        context.scale(this.frame.scale, this.frame.scale);
        this.drawIris();
        context.restore();

        this.drawSelection();
        this.drawIcon();
      });
    },
    drawBackground() {
      const canvas = this.$refs.mainFrame;
      const context = canvas.getContext('2d');

      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
    },
    drawIcon() {
      if (this.options.icon) {
        const canvas = this.$refs.mainFrame;
        const context = canvas.getContext('2d');

        const destWidth = icon.width;
        const destHeight = icon.height;
        const x = Math.round((canvas.width - destWidth) / 2);
        const y = Math.round((canvas.height - destHeight) / 2);

        // TODO CHECK LOGO PROPORTIONS (like drawIris())
        context.drawImage(
          icon,
          x,
          y,
          destWidth,
          destHeight
        )
      }
    },
    drawIris() {
      const canvas = this.$refs.mainFrame;
      const context = canvas.getContext('2d');

      let destinationWidth = null;
      let destinationHeight = null;

      // We want to smart-draw the image into the canvas. It means we have to
      // check the canvas aspect ratio to see if the destination rectangle
      // coordinate will be in proportion of the width or the height.
      if (canvas.width < canvas.height) {
        const ratio = canvas.width / canvas.height;
        destinationHeight = canvas.height * ratio; // Keep the Iris proportion
        destinationWidth = canvas.height / (canvas.height / canvas.width)
      } else {
        const ratio = canvas.height / canvas.width;
        destinationWidth = canvas.width * ratio; // Keep the Iris proportion
        destinationHeight = canvas.width / (canvas.width / canvas.height)
      }

      // Let's rescale the big image to make it fit our canvas
      context.drawImage(
        irisCanvas,
        0, // TODO center it
        0,
        destinationWidth,
        destinationHeight
      );
    },
    drawSelection() {
      const canvas = this.$refs.mainFrame;
      const context = canvas.getContext('2d');

      const base = Math.min(canvas.height, canvas.width) * 0.75; // Maximum width/height that should be used
      const aspectRatio = this.options.aspectRatio;

      const [aspectRatioWidth, aspectRatioHeight] = aspectRatio.split(':');

      if (!aspectRatioWidth || !aspectRatioHeight) return;

      let selectionWidth = aspectRatioWidth;
      let selectionHeight = aspectRatioHeight;

      // Resize the Selection to something more user-friendly
      // TODO should I check the aspect ratios instead?
      if (this.frame.width > this.frame.height ) { // TODO sth wrong here, NEEDS REFACTORING
      // if (this.frame.width / this.frame.height < aspectRatioWidth / aspectRatioHeight) {
        selectionWidth = base;
        selectionHeight = Math.round(aspectRatioHeight * base / aspectRatioWidth)
      } else {
        selectionWidth = Math.round(aspectRatioWidth * base / aspectRatioHeight);
        selectionHeight = base;
      }

      const x = Math.round((canvas.width - selectionWidth) / 2); // TODO check if rounding affect things badly
      const y = Math.round((canvas.height - selectionHeight) / 2);

      context.strokeStyle = 'rgb(255, 255, 255, 255)';
      context.strokeRect(x, y, selectionWidth, selectionHeight);

      // Build the rectangle to focus on the center of the image
      context.fillStyle = 'rgba(0, 0, 0, .5)'
      // context.fillStyle = 'rgba(255, 255, 255, .3)'
      context.fillRect(0, 0, x + selectionWidth, y);
      context.fillRect(0, y, x, y + selectionHeight);
      context.fillRect(x, y + selectionHeight, canvas.width, canvas.height);
      context.fillRect(x + selectionWidth, 0, x + selectionWidth, y + selectionHeight);
    }
  },
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
  display: flex;
  flex-direction: column;
}

.iris__frame {
  flex: 1 1 auto;
  overflow: hidden;
}

.iris__frame__canvas {
  opacity: 0;
  transition: opacity ease-in-out .4s;

  &.-is-dragging {
    cursor: move;
  }

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

.iris__toolbar__about {
  margin-top: auto;

  .about small {
    display: block;
    font-size: .750rem;
    color: #bbb;
    text-align: center;
  }
}

.snap {
  width: 100%;
}
</style>
