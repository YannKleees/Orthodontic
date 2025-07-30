/* convert a box drawn on‑screen back to *natural* mosaic coordinates */
export function unscaleBox(
  box: { x:number; y:number; width:number; height:number },
  natural : { w:number; h:number },
  displayed: { w:number; h:number }
) {
  const sx = natural.w / displayed.w;      // inverse of scaleBox
  const sy = natural.h / displayed.h;
  return {
    x     : box.x      * sx,
    y     : box.y      * sy,
    width : box.width  * sx,
    height: box.height * sy,
  };
}
