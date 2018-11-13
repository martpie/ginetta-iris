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
        <div class="form-control">
          <label for="iris-form-icon">
            <input
              id="iris-form-icon"
              v-model="options.icon"
              class="checkbox-control"
              type="checkbox"
            >
            Include the little guy
          </label>
        </div>
        <div class="form-control">
          <button @click="snap">Snap!</button>
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
        icon: false
      }
    }
  },
  mounted() {
    const _self = this;

    iris = new Image();
    icon = new Image();

    const canvas = this.$refs.mainFrame;
    const context = canvas.getContext('2d');
    const d3canvas = d3.select(canvas);

    window.addEventListener('resize', refresh, { passive: true });

    function zoomed() {
      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();
      context.translate(d3.event.transform.x, d3.event.transform.y);
      context.scale(d3.event.transform.k, d3.event.transform.k);
      drawIris();
      context.restore();
      drawSelection();
      drawIcon();
    }

    function refresh() {
      _self.refreshFrameDimensions();
      window.requestAnimationFrame(() => {
        context.save();
        drawBackground();
        drawIris();
        drawSelection();
        drawIcon();
        context.restore();
      });
    }

    function drawIris() {
      let destinationWidth = 400;
      let destinationHeight = 400;

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
        iris,
        0, // TODO center it
        0,
        destinationWidth,
        destinationHeight
      );
    }

    function drawBackground() {
      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawSelection() {
      const selectionWidth = 600;
      const selectionHeight = 400;
      const x = Math.round((canvas.width - selectionWidth) / 2); // TODO check if rounding affect things badly
      const y = Math.round((canvas.height - selectionHeight) / 2);

      context.strokeStyle = 'rgb(255, 255, 255, 255)';
      context.strokeRect(x, y, selectionWidth, selectionHeight);

      // Build the rectangle to focus on the center of the image
      context.fillStyle = 'rgba(255, 255, 255, .3)'
      context.fillRect(0, 0, x + selectionWidth, y);
      context.fillRect(0, y, x, y + selectionHeight);
      context.fillRect(x, y + selectionHeight, canvas.width, canvas.height);
      context.fillRect(x + selectionWidth, 0, x + selectionWidth, y + selectionHeight);
    }

    function drawIcon() {
      const iconWidth = 100;
      const iconHeight = 100;
      const x = Math.round((canvas.width - iconWidth) / 2);
      const y = Math.round((canvas.height - iconHeight) / 2);

      // TODO CHECK LOGO PROPORTIONS (like drawIris())
      context.drawImage(
        icon,
        x,
        y,
        iconWidth,
        iconHeight
      )
    }

    iris.onload = () => {
      // const { width, height } = getCanvasMaxDimensions(iris.width, iris.height);
      refresh();

      // Looks like reactivity is not instantaneous
      setTimeout(() => {
        d3canvas.call(d3.zoom()
          .scaleExtent([MIN_SCALE, MAX_SCALE])
          .on("zoom", zoomed));

        drawBackground();
        drawIris();
        drawSelection();
        drawIcon();

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
    changePreset(e) {
      this.options.aspectRatio = e.currentTarget.value;
    },
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
</style>
