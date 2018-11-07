// Browser have trouble with really large canvas, so let's keep it not "too" big
const MAX_CANVAS_WIDTH_HEIGHT = 10000;

export const getCanvasMaxDimensions = (width, height) => {
  if (width > height) {
    return {
      width: MAX_CANVAS_WIDTH_HEIGHT,
      height: Math.round(height * MAX_CANVAS_WIDTH_HEIGHT / width)
    };
  }

  return {
    width: Math.round(width * MAX_CANVAS_WIDTH_HEIGHT / height),
    height: MAX_CANVAS_WIDTH_HEIGHT
  };
};
