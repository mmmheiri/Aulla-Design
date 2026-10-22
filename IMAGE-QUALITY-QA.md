# Image clarity and swipe refinement — 23 October 2026

- Re-encoded the eleven catalogue model masters losslessly. Responsive model views now choose at least the 960px rendition, without changing garment colour, face identity or source photography.
- Hero uses 960px PNG with alpha instead of lossy WebP; WebGL uses matching premultiplied-alpha upload/compositing and up to 3x display resolution. The original image replaces the canvas after the 2.4-second transition, keeping the stationary garment sharp.
- Product gallery and pagination dots accept horizontal mouse/touch swipes in both languages. Related products retain native touch scrolling and add mouse dragging. Vertical intent cancels the custom gesture; a completed swipe suppresses the subsequent accidental click.
- Checked all eleven hero images together on the beige background. Local Chromium mobile emulation at 390px/3x passed English and Arabic gallery mouse swipe, synthesized touch swipe over dots, lens click suppression, stationary canvas retirement, high-resolution image selection and horizontal-overflow checks.
- TypeScript and deployment production build passed. This is browser emulation, not a physical iPhone/Safari certification. No new image generation, garment modification or live order/payment occurred.
