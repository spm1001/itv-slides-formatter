# Designer Shopping List

**Purpose:** This document specifies exactly what the design team needs to define for the ITV Slides template. Each item maps to a controllable property in the Google Slides/Sheets API.

---

## 1. Color Palette

Google Slides uses a 12-slot theme color system. Designers need to specify exact RGB/HEX values for each.

| Slot | Purpose | Your Specification |
|------|---------|-------------------|
| **DARK1** | Primary dark (text on light backgrounds) | |
| **LIGHT1** | Primary light (text on dark backgrounds) | |
| **DARK2** | Secondary dark | |
| **LIGHT2** | Secondary light (backgrounds) | |
| **ACCENT1** | Primary brand color | |
| **ACCENT2** | Secondary accent | |
| **ACCENT3** | Tertiary accent | |
| **ACCENT4** | Fourth accent | |
| **ACCENT5** | Fifth accent | |
| **ACCENT6** | Sixth accent | |
| **HYPERLINK** | Link color (inherits to all links) | |
| **FOLLOWED_HYPERLINK** | Visited link color | |

**Questions for designers:**
- [ ] Colorblind-safe palette verification?
- [ ] Dark mode / inverted variants needed?
- [ ] Additional custom colors beyond the 12 theme slots?

---

## 2. Typography

### ⚠️ Google's Baked-In Defaults (The Goblins)

Non-placeholder elements do NOT inherit from the master template. They have hardcoded defaults:

| Element Type | Default Font | Default Size | Inherits? |
|--------------|--------------|--------------|-----------|
| **Plain text box** | Arial | 18pt | ❌ No |
| **Shape with text** | Arial | 14pt | ❌ No |
| **Table cells** | Arial | 14pt | ❌ No |
| **Chart title** | Roboto | (Sheets default) | ❌ No (Sheets API) |
| **Chart axis/legend** | (unset) | (Sheets default) | ❌ No (Sheets API) |

Placeholder elements (Title, Body, Subtitle, Speaker Notes) DO inherit from master. ✅

### 2.1 Font Family

| Element | Font Family | Fallback |
|---------|-------------|----------|
| **Headings** | | Sans-serif |
| **Body text** | | Sans-serif |
| **Data/Tables** | Public Sans? | Sans-serif |
| **Speaker notes** | | |

### 2.2 Font Sizes (in points)

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| **Slide title** | | | e.g., 44pt Bold |
| **Slide subtitle** | | | e.g., 24pt Regular |
| **Section header** | | | |
| **Body text** | | | e.g., 18pt Regular |
| **Body text (small)** | | | |
| **Table header** | | | |
| **Table data** | | | |
| **Chart title** | | | |
| **Chart axis labels** | | | |
| **Chart legend** | | | |
| **Chart data labels** | | | |
| **Footnote/Source** | | | |
| **Speaker notes** | | | |

### 2.3 Line & Paragraph Spacing

| Property | Value | Notes |
|----------|-------|-------|
| **Line spacing** | | Percentage (100 = single, 150 = 1.5 line) |
| **Space above paragraph** | | Points |
| **Space below paragraph** | | Points |
| **First line indent** | | Points (0 for flush left) |

---

## 3. Bullet Styles

Define for each nesting level (Slides supports up to 9 levels, but 3-4 is practical).

| Level | Glyph | Indent | Size | Color |
|-------|-------|--------|------|-------|
| **Level 1** | ● / – / ▸ ? | | | |
| **Level 2** | | | | |
| **Level 3** | | | | |
| **Level 4** | | | | |

**Numbered list style:** 1. / a. / i. / (1) ?

---

## 4. Shapes & Diagrams

### 4.1 Rectangles / Boxes

| Property | Value | Notes |
|----------|-------|-------|
| **Corner radius** | | 0 = sharp, or specify px |
| **Fill color** | | Theme color reference or hex |
| **Border weight** | | Points (0 = no border) |
| **Border color** | | |
| **Drop shadow** | Yes/No | |
| **Shadow angle** | | 45° as specified |
| **Shadow blur** | | Points |
| **Shadow offset** | | Points |
| **Shadow color/opacity** | | |

### 4.2 Circles / Ovals

| Property | Value | Notes |
|----------|-------|-------|
| **Border weight** | | 5px as specified? |
| **Border color** | | |
| **Fill** | | Solid / transparent |
| **Shadow** | | None as specified |

### 4.3 Connectors / Arrows

| Property | Value | Notes |
|----------|-------|-------|
| **Line weight** | | Points |
| **Line color** | | |
| **Line style** | | Solid / dashed / dotted |
| **Start arrow** | | None / open / filled |
| **End arrow** | | None / open / filled |

### 4.4 Text in Shapes

| Property | Value | Notes |
|----------|-------|-------|
| **Vertical alignment** | | Top / Middle / Bottom |
| **Horizontal alignment** | | Left / Center / Right |
| **Padding (internal margin)** | | Points |
| **Autofit behavior** | | Shrink text / Resize shape / None |

---

## 5. Tables

| Property | Value | Notes |
|----------|-------|-------|
| **Header row background** | | Theme color or hex |
| **Header text style** | | Bold? Color? |
| **Alternating row colors** | | Yes/No, colors if yes |
| **Border weight** | | Points |
| **Border color** | | |
| **Cell padding** | | Points |
| **Numeric alignment** | | Right / Center |
| **Text alignment** | | Left |
| **Negative number format** | | -X / (X) / red? |
| **Decimal places default** | | |

---

## 6. Charts (Embedded from Sheets)

### 6.1 Series Colors

Define up to 8 colors for data series in order of use:

| Series | Color (HEX) | Notes |
|--------|-------------|-------|
| Series 1 | | Primary data |
| Series 2 | | |
| Series 3 | | |
| Series 4 | | |
| Series 5 | | |
| Series 6 | | |
| Series 7 | | |
| Series 8 | | |

### 6.2 Chart Elements

| Element | Font | Size | Color | Other |
|---------|------|------|-------|-------|
| **Chart title** | | | | Position: top-left? |
| **Axis titles** | | | | |
| **Axis labels** | | | | |
| **Legend** | | | | Position: bottom |
| **Data labels** | | | | Match series color? |

### 6.3 Chart Formatting

| Property | Value | Notes |
|----------|-------|-------|
| **Gridlines** | | None / horizontal only / both |
| **Axis lines** | | Show / hide |
| **Tick marks** | | Major / minor / none |
| **Background** | | Transparent / white / color |
| **Border** | | None / thin line |
| **Scatter plot opacity** | | 50% as specified? |

---

## 7. Slide Layouts

Which master layouts do we need?

- [ ] Title slide (deck title + subtitle)
- [ ] Section divider
- [ ] Title + body text
- [ ] Title + two columns (text + visual)
- [ ] Title + full-width chart
- [ ] Title + table
- [ ] Title only (for diagrams)
- [ ] Blank
- [ ] Closing slide

---

## 8. Speaker Notes

| Property | Value |
|----------|-------|
| **Font family** | |
| **Font size** | |
| **Bullet style** | |

---

## 9. Derived/Automatic Properties

These can be calculated from other values — confirm the derivation rules:

| Property | Derivation Rule | Override? |
|----------|-----------------|-----------|
| Subtitle size | Title × 0.55? | |
| Small text | Body × 0.85? | |
| Bold weight | 700 | |
| Regular weight | 400 | |

---

## Appendix A: What the API Cannot Control

For awareness — these are limited or not controllable via API:

1. **Hyperlink colors** — inherit from theme, cannot be custom per-link
2. **Table borders** — limited to uniform styling, not per-cell
3. **Theme fonts** — can set per-element but not as "theme default"
4. **Animations/transitions** — not controllable via API

**Good news:** Master slide inheritance IS controllable via API (see Appendix C).

---

---

## Appendix B: API Technical Reference

### Units
- **EMU (English Metric Units)**: 914400 EMU = 1 inch = 72 points
- Therefore: 12700 EMU = 1 point
- Common outline weight: 9525 EMU ≈ 0.75pt
- Thicker outline: 19050 EMU ≈ 1.5pt

### Shape Types Available
| Shape Type | Notes |
|------------|-------|
| TEXT_BOX | Plain text container |
| RECTANGLE | Basic rectangle |
| ELLIPSE | Circle/oval |
| WEDGE_RECTANGLE_CALLOUT | Callout with pointer |
| LEFT_ARROW, RIGHT_ARROW, etc. | Arrow shapes |
| (many more...) | See Slides API docs |

### Shadow Properties
- Type: OUTER (drop shadow)
- Properties: blur radius, offset, alpha (opacity), color
- All values in EMU

### Field Mask Behavior
When updating styles via API:
- List fields you're changing in `fields` parameter
- Property in body but NOT in mask → **silently ignored**
- Property in mask but NOT in body → **cleared to default**
- This enables bulk reset: `style: {}, fields: "fontFamily,fontSize,..."` clears those fields

---

## Appendix C: Inheritance Model & "Goblin Census"

**Critical finding from API testing:** Not all elements inherit from the master template. This affects the formatter strategy.

### Inheritance Behavior by Element Type

| Element Type | Inherits from Master? | Default Font | Default Size | Formatter Strategy |
|--------------|----------------------|--------------|--------------|-------------------|
| **Title placeholder** | ✅ Yes | (from master) | (from master) | Clear overrides |
| **Body placeholder** | ✅ Yes | (from master) | (from master) | Clear overrides |
| **Subtitle placeholder** | ✅ Yes | (from master) | (from master) | Clear overrides |
| **Speaker notes** | ✅ Yes | (from master) | (from master) | Clear overrides |
| **Plain text box** | ❌ **NO** | Arial | 18pt | Explicit SET |
| **Rectangle with text** | ❌ **NO** | Arial | 14pt | Explicit SET |
| **Any shape with text** | ❌ **NO** | Arial | 14pt | Explicit SET |
| **Table cells** | ❌ **NO** | Arial | 14pt | Explicit SET |
| **Chart title** | ❌ **NO** (Sheets API) | Roboto | (Sheets default) | Sheets API |
| **Chart axis/legend** | ❌ **NO** (Sheets API) | (unset) | (Sheets default) | Sheets API |

### What This Means

**The Good:**
- Placeholder elements (Title, Body, Subtitle, Notes) respect master inheritance
- We can "clear overrides" on these elements and the master styling takes over
- Updating the master propagates to all inheriting elements automatically

**The Goblins (Bad):**
- Non-placeholder shapes default to **Arial** — hardcoded, not inherited
- Tables default to **Arial 14pt** — hardcoded
- Charts use **Roboto** and are controlled by a completely separate API (Sheets)
- Clearing styles on non-placeholder elements just resets to Arial, not to master

### Formatter Strategy

```
For each element:
├── Is it a placeholder (TITLE, BODY, SUBTITLE)?
│   └── YES → Clear overrides (inheritance works)
├── Is it a text box or shape with text?
│   └── NO inheritance → Must explicitly SET font/size/color
├── Is it a table?
│   └── NO inheritance → Must explicitly SET all cell styles
└── Is it a chart?
    └── Use Sheets API to modify chart spec (separate operation)
```

### Verified by Testing

These findings were verified by creating a test presentation and:
1. Creating placeholder text → confirmed no style keys (pure inheritance)
2. Applying ugly override (Comic Sans, red) → confirmed style keys appear
3. Clearing with empty style + field mask → confirmed returns to inheritance
4. Updating master TITLE placeholder → confirmed slides inherit the change
5. Creating plain text box → confirmed Arial 18pt baked in
6. Creating table → confirmed Arial 14pt baked in
7. Clearing text box styles → confirmed reverts to Arial (not master)

Test artifacts available in Drive (search "API Mutation Test - DELETE ME").

---

*Document version: Draft 2*
*Updated: 2026-01-10*
*Goblin census verified via API testing on vanilla presentation*
