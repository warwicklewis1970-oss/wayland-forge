# Wayland design file (`.wayland.json`)

A shared, versioned file that **Wayland Forge**, **Waylands Path**, and a future third app (working name: *Waylands Finish*) can all open. Units are millimetres. The file is ordinary JSON, so you can also send it as an email attachment or save it to a laptop.

**Schema version:** 1  
**Format id:** `"wayland-design"`

## Why two levels of data?

- **`layers`** – the common picture: paths, images and roles (`etch`, `cut-inner`, `cut-outer`, `print-only`, `guide`) in millimetres. Any of the three apps can read this.
- **`apps`** – a private bag for each app, so a round trip does not lose anything. Path stores its exact lines, tabs, slots and holes here. Forge stores its full project (lettering, shapes, pictures) here. The third app should not need this bag to make files, but may keep its own cut / etch / print settings in `apps["waylands-finish"]`.

If an app finds its own bag, it restores that first (lossless). Otherwise it builds what it can from `layers`.

## Top level

| Field | Meaning |
|---|---|
| `format` | Always `"wayland-design"` |
| `schema` | Integer, currently `1` |
| `name` | Project name |
| `units` | Always `"mm"` |
| `artboard` | `{ "width": number, "height": number }` – size of the design in mm |
| `origin` | `"top-left"` (y grows downward, like the screen and SVG). Laser 0,0 is still the bottom-left of the design when files are made. |
| `created` | ISO date-time when the file was written |
| `source` | `{ "app": "waylands-path" \| "wayland-forge" \| "waylands-finish", "version": "v5.9" }` |
| `layers` | Array of layers (see below) |
| `apps` | Optional object, keys are app ids |
| `settings` | Optional hints only (line width, whether cutting is on). These do **not** override the laser defaults in Path or Forge. |

## A layer

```json
{
  "id": "L1",
  "name": "Lines",
  "visible": true,
  "items": [ ]
}
```

## An item

**Path** (`type: "path"`): a line or a closed shape.

- `role`: `etch` | `cut-inner` | `cut-outer` | `print-only` | `guide`
- `closed`: true if the ends meet
- `strokeMm`: optional engraved thickness
- `d`: SVG path in mm (for other apps)
- `nodes`: optional Path Bezier nodes (for a lossless Path round trip; also stored in the Path bag)
- `hole`, `slot`, `tabs`: optional Path hardware (copied into the Path bag too)

**Image** (`type: "image"`): a raster picture.

- `href`: a `data:image/…;base64,…` URL, or omitted if it could not be stored
- `x`, `y`, `width`, `height` in mm (top-left of the box), optional `rotation` in degrees
- `clip`: optional clip path in mm
- `role`: usually `print-only` or `guide` (pictures are not burned unless the user traces or sets them to etch/cut in Forge)

**Text as paths** (`type: "text-paths"`): letters already turned into outlines (how Forge sends lettering to Path).

- `role`, `items`: an array of `path` items, or a single combined `d`

## Same-device hand-off

On the same phone or tablet, the apps already share an IndexedDB named `wayland-share` (they live on the same GitHub Pages site).

- Key `toPath` – Forge → Path. Still includes the original SVG (`v: 1`) so older Path versions keep working. Newer versions also include `design` (`v: 2`).
- Key `toForge` – Path → Forge. Value is `{ v: 2, from, name, design, t }`.
- Open with `?from=forge` or `?from=path`.

If the apps cannot share storage (phone → laptop, or a copy opened from a file), use **Save as Wayland design** and **Open Wayland design**.

## What this file does not do

It does not change the LaserGRBL files Path or Forge already make. Those Export buttons stay where they are. The third app will be the place for a single set of cut / etch / print settings, once it has been proven against real burns.

## File name

`Project name.wayland.json` (Windows-safe). Ordinary `.json` is also accepted if the contents have `"format": "wayland-design"`.
