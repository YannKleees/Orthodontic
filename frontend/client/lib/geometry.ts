/** ------------------------------------------------------------------
 *  Convert a box defined in the ORIGINAL mosaic coordinate‑system
 *  to CSS‑pixels inside the DISPLAYED image container.
 *  ----------------------------------------------------------------- */
export function scaleBox(
  box: { x:number; y:number; width:number; height:number },
  natural: { w:number; h:number },        // numbers stored on the Visit
  displayed: { w:number; h:number }       // <img> element size
) {
  const sx = displayed.w / natural.w;
  const sy = displayed.h / natural.h;
  return {
    left  : box.x      * sx,
    top   : box.y      * sy,
    width : box.width  * sx,
    height: box.height * sy,
  };
}
