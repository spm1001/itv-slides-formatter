# ITV Slides Formatter: Experimental Protocol

Version: 1.0
Date: January 2026
Status: Ready for execution

---

## Purpose

This document defines a battery of experiments to establish ground truth about Google Sheets chart behavior and Sheets-Slides linking mechanics. The findings will inform architectural decisions in the ITV Slides Formatter system.

The experiments are designed for execution in a rapid iteration loop (observe → modify → deploy → run → observe → record). Each experiment has:
- **Hypothesis**: What we expect to happen
- **Method**: Step-by-step execution
- **Observations to Record**: Specific data points to capture
- **Decision Implications**: How findings affect the architecture

---

## Experimental Environment Setup

### Prerequisites

1. **Test Spreadsheet**: [ITV_Chart_Experiments](https://docs.google.com/spreadsheets/d/1uVNby-sLTDIyozwrzAXpgLWlkweIe4L94nWZZvcmps4)
2. **Test Presentation**: [ITV_Slides_Experiments](https://docs.google.com/presentation/d/1jCr7vmCg_XciYFbxX9oy4VM9OnPqkjfJj7Bbt2X2pwU)
3. **Findings Folder**: RAGE AGAINST THE MACHINE/Slides API Experiments/Findings/
4. **Sample Data**: Populate the spreadsheet with simple test data:

```
| Month | Revenue | Costs |
|-------|---------|-------|
| Jan   | 100     | 80    |
| Feb   | 120     | 85    |
| Mar   | 115     | 90    |
| Apr   | 140     | 95    |
| May   | 160     | 100   |
| Jun   | 155     | 105   |
```

5. **Test Charts**: Create one of each type for comprehensive testing:
   - Bar chart (vertical)
   - Column chart (horizontal)
   - Line chart
   - Pie chart
   - Area chart
   - Combo chart (if used at ITV)

6. **OAuth Scopes**: Ensure test script has:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/presentations`
   - `https://www.googleapis.com/auth/drive.readonly`

### Utility Functions

```javascript
/**
 * Utility: Get chart dimensions from Sheets (floating charts only)
 */
function getChartDimensions(spreadsheetId, chartId) {
  const ss = Sheets.Spreadsheets.get(spreadsheetId);
  for (const sheet of ss.sheets) {
    for (const chart of sheet.charts || []) {
      if (chart.chartId === chartId) {
        if (chart.position.overlayPosition) {
          return {
            type: 'FLOATING',
            width: chart.position.overlayPosition.widthPixels,
            height: chart.position.overlayPosition.heightPixels,
            aspectRatio: chart.position.overlayPosition.widthPixels /
                         chart.position.overlayPosition.heightPixels
          };
        } else {
          return {
            type: 'CHART_SHEET',
            width: null,
            height: null,
            aspectRatio: null,
            sheetId: chart.position.sheetId
          };
        }
      }
    }
  }
  return null;
}

/**
 * Utility: Get embedded chart info from Slides
 */
function getEmbeddedChartInfo(presentationId, chartObjectId) {
  const pres = Slides.Presentations.get(presentationId);
  for (const slide of pres.slides) {
    for (const element of slide.pageElements || []) {
      if (element.objectId === chartObjectId && element.sheetsChart) {
        return {
          objectId: element.objectId,
          spreadsheetId: element.sheetsChart.spreadsheetId,
          chartId: element.sheetsChart.chartId,
          contentUrl: element.sheetsChart.contentUrl,
          size: element.size,
          transform: element.transform
        };
      }
    }
  }
  return null;
}

/**
 * Utility: Calculate effective dimensions from size and transform
 */
function getEffectiveDimensions(size, transform) {
  const baseWidth = size.width.magnitude;
  const baseHeight = size.height.magnitude;
  const scaleX = transform.scaleX || 1;
  const scaleY = transform.scaleY || 1;
  return {
    width_emu: baseWidth * scaleX,
    height_emu: baseHeight * scaleY,
    aspectRatio: (baseWidth * scaleX) / (baseHeight * scaleY)
  };
}

/**
 * Utility: Fetch image and measure actual pixel dimensions
 * Note: contentUrl expires after 30 minutes
 */
function measureImageDimensions(contentUrl) {
  const response = UrlFetchApp.fetch(contentUrl);
  const blob = response.getBlob();
  // For PNG/JPEG, dimensions are in header
  // This requires parsing - see experiment for manual approach
  return {
    blob: blob,
    contentType: blob.getContentType(),
    bytes: blob.getBytes().length
  };
}
```

---

## Sheets Experiments (S-Series)

### Experiment S1: Chart Sheet Aspect Ratio Discovery

**Bead:** `itv-slides-formatter-8ke`

**Hypothesis**: When a chart is on its own sheet (no overlayPosition), Google uses some default aspect ratio when rendering for export or embedding. This ratio may be consistent across chart types, or may vary.

**Method**:

1. Create a bar chart as a floating chart (default dimensions: 600×371)
2. Record the floating chart's aspect ratio: `600/371 = 1.617`
3. Move the chart to its own sheet via UI: Chart menu → "Move to own sheet"
4. Verify via API that the chart now has `position.sheetId` and no `overlayPosition`
5. Export the chart sheet chart as an image:
   ```javascript
   function exportChartImage(spreadsheetId, chartId) {
     const chart = SpreadsheetApp.openById(spreadsheetId)
       .getCharts()
       .find(c => c.getChartId() === chartId);
     const blob = chart.getAs('image/png');
     DriveApp.createFile(blob.setName(`chart_${chartId}_export.png`));
     return blob;
   }
   ```
6. Download the exported image and measure its pixel dimensions
7. Calculate aspect ratio of exported image
8. Repeat steps 1-7 for each chart type (line, pie, area, combo)

**Observations to Record**:

| Chart Type | Floating AR | Chart Sheet Export Width | Chart Sheet Export Height | Chart Sheet AR | AR Difference |
|------------|-------------|--------------------------|---------------------------|----------------|---------------|
| Bar        | 1.617       |                          |                           |                |               |
| Line       | 1.617       |                          |                           |                |               |
| Pie        | 1.617       |                          |                           |                |               |
| Area       | 1.617       |                          |                           |                |               |
| Combo      | 1.617       |                          |                           |                |               |

**Decision Implications**:
- If chart sheet AR is consistent (e.g., always 1.617), we can design Slides containers to match
- If chart sheet AR varies by type, we need type-specific container dimensions
- If chart sheet AR is unpredictable, we must accept letterboxing or use floating charts

---

### Experiment S2: Floating Chart Dimension Control

**Bead:** `itv-slides-formatter-bwb`

**Hypothesis**: We can set arbitrary dimensions on floating charts via `UpdateEmbeddedObjectPositionRequest`, and those dimensions persist.

**Method**:

1. Create a floating bar chart with default dimensions
2. Read initial dimensions via API
3. Resize to 16:9 ratio (e.g., 960×540):
   ```javascript
   function resizeFloatingChart(spreadsheetId, chartId, width, height) {
     Sheets.Spreadsheets.batchUpdate({
       requests: [{
         updateEmbeddedObjectPosition: {
           objectId: chartId,
           newPosition: {
             overlayPosition: {
               anchorCell: { sheetId: 0, rowIndex: 10, columnIndex: 0 },
               widthPixels: width,
               heightPixels: height
             }
           },
           fields: 'overlayPosition(anchorCell,widthPixels,heightPixels)'
         }
       }]
     }, spreadsheetId);
   }
   ```
4. Read dimensions again - verify they match requested
5. Close and reopen spreadsheet
6. Read dimensions again - verify persistence
7. Resize to 1:1 ratio (e.g., 500×500)
8. Export as image and verify export matches specified dimensions

**Observations to Record**:

| Step | Requested Width | Requested Height | Actual Width | Actual Height | Match? |
|------|-----------------|------------------|--------------|---------------|--------|
| Initial | - | - | | | |
| After resize to 16:9 | 960 | 540 | | | |
| After reopen | - | - | | | |
| After resize to 1:1 | 500 | 500 | | | |
| Export dimensions | - | - | | | |

**Decision Implications**:
- If dimensions are fully controllable, floating charts become viable for controlled embedding
- If dimensions drift or have constraints, document the constraints

---

### Experiment S3: Chart Styling API Coverage

**Bead:** `itv-slides-formatter-gmp`

**Hypothesis**: Some chart style properties are API-controllable, others are UI-only. We need to map the boundary.

**Method**:

For each property category, attempt to set via `UpdateChartSpecRequest` and verify the result:

1. **Background color**
   ```javascript
   spec.basicChart.chartStyle = {
     backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
   };
   ```

2. **Title text and formatting**
   ```javascript
   spec.title = 'Test Title';
   spec.titleTextFormat = {
     fontFamily: 'Arial',
     fontSize: 14,
     bold: true,
     foregroundColor: { red: 0, green: 0, blue: 0 }
   };
   spec.titleTextPosition = { horizontalAlignment: 'CENTER' };
   ```

3. **Legend position and formatting**
   ```javascript
   spec.basicChart.legendPosition = 'BOTTOM_LEGEND';
   // Note: Legend font formatting may not be available
   ```

4. **Axis titles and formatting**
   ```javascript
   spec.basicChart.axis = [{
     position: 'BOTTOM_AXIS',
     title: 'Month',
     format: {
       fontFamily: 'Arial',
       fontSize: 10,
       bold: false
     }
   }];
   ```

5. **Axis label formatting** (likely UI-only)
   ```javascript
   // Attempt to set axis label rotation, font, etc.
   ```

6. **Series colors**
   ```javascript
   spec.basicChart.series = [{
     series: { sourceRange: { sources: [{ ... }] } },
     color: { red: 0, green: 0.64, blue: 0.88 }  // ITV Blue
   }];
   ```

7. **Gridlines** (likely UI-only)
   ```javascript
   // Attempt to control gridline visibility, color, style
   ```

8. **Data labels**
   ```javascript
   spec.basicChart.series[0].dataLabel = {
     type: 'DATA',
     textFormat: { fontFamily: 'Arial', fontSize: 9 }
   };
   ```

**Observations to Record**:

| Property | API Field Attempted | Set Successful? | Persisted After Re-read? | Notes |
|----------|---------------------|-----------------|--------------------------|-------|
| Background color | chartStyle.backgroundColor | | | |
| Title text | title | | | |
| Title font family | titleTextFormat.fontFamily | | | |
| Title font size | titleTextFormat.fontSize | | | |
| Title color | titleTextFormat.foregroundColor | | | |
| Legend position | basicChart.legendPosition | | | |
| Legend font | (no field?) | | | |
| Axis title | basicChart.axis[].title | | | |
| Axis title font | basicChart.axis[].format | | | |
| Axis label font | (no field?) | | | |
| Axis label rotation | (no field?) | | | |
| Series color | basicChart.series[].color | | | |
| Gridline visibility | (no field?) | | | |
| Gridline color | (no field?) | | | |
| Data label visibility | basicChart.series[].dataLabel.type | | | |
| Data label font | basicChart.series[].dataLabel.textFormat | | | |

**Decision Implications**:
- Map the "API ceiling" - what we can automate
- Document UI-only properties for user guidance
- Determine if UI-only gaps are acceptable or require workarounds (templates)

---

### Experiment S4: Move to Own Sheet via API

**Bead:** `itv-slides-formatter-sev`

**Hypothesis**: We can programmatically move a floating chart to its own sheet using `UpdateEmbeddedObjectPositionRequest` with `newSheet: true`.

**Method**:

1. Create a floating chart
2. Record its chartId and current position
3. Move to own sheet:
   ```javascript
   function moveChartToOwnSheet(spreadsheetId, chartId) {
     const response = Sheets.Spreadsheets.batchUpdate({
       requests: [{
         updateEmbeddedObjectPosition: {
           objectId: chartId,
           newPosition: {
             newSheet: true
           }
         }
       }]
     }, spreadsheetId);
     return response;
   }
   ```
4. Verify chart now has `position.sheetId` (not `overlayPosition`)
5. Record the new sheet's name and ID
6. Attempt to rename the sheet:
   ```javascript
   Sheets.Spreadsheets.batchUpdate({
     requests: [{
       updateSheetProperties: {
         properties: {
           sheetId: NEW_SHEET_ID,
           title: 'chart_bar_16x9_revenue'
         },
         fields: 'title'
       }
     }]
   }, spreadsheetId);
   ```
7. Verify the rename succeeded

**Observations to Record**:

| Step | Result | Notes |
|------|--------|-------|
| Initial chart position | overlayPosition present? | |
| Move API call | Success/Error | |
| Post-move position | sheetId present? | |
| Auto-generated sheet name | | |
| Rename API call | Success/Error | |
| Final sheet name | | |

**Decision Implications**:
- Confirms viability of automated chart sheet enforcement
- Tests sheet naming capability for metadata encoding

---

## Linking Experiments (L-Series)

### Experiment L1: Embedding Aspect Ratio Behavior

**Bead:** `itv-slides-formatter-f51`

**Hypothesis**: When embedding a chart into Slides, the chart maintains its aspect ratio and letterboxes within the specified container.

**Method**:

1. Create a floating chart in Sheets with known dimensions (e.g., 600×371, AR=1.617)
2. Embed into Slides with MATCHING container dimensions:
   ```javascript
   function embedChart(presentationId, slideId, spreadsheetId, chartId, widthEmu, heightEmu) {
     return Slides.Presentations.batchUpdate({
       requests: [{
         createSheetsChart: {
           spreadsheetId: spreadsheetId,
           chartId: chartId,
           linkingMode: 'LINKED',
           elementProperties: {
             pageObjectId: slideId,
             size: {
               width: { magnitude: widthEmu, unit: 'EMU' },
               height: { magnitude: heightEmu, unit: 'EMU' }
             },
             transform: {
               scaleX: 1, scaleY: 1,
               translateX: 914400, translateY: 914400,
               unit: 'EMU'
             }
           }
         }
       }]
     }, presentationId);
   }

   // Matching: 600px × 371px ≈ 5715000 EMU × 3534525 EMU
   embedChart(presId, slideId, ssId, chartId, 5715000, 3534525);
   ```
3. Visually inspect - does chart fill container without letterboxing?
4. Fetch the contentUrl and measure actual image dimensions
5. Embed same chart with MISMATCHED container (e.g., 16:9 = 6858000 × 3857625):
   ```javascript
   embedChart(presId, slideId2, ssId, chartId, 6858000, 3857625);
   ```
6. Visually inspect - is there letterboxing?
7. Measure the letterbox margins (if any)
8. Repeat with 1:1 container and 4:3 container

**Observations to Record**:

| Container AR | Chart AR | Expected Behavior | Actual Behavior | Letterbox Location | Letterbox Size |
|--------------|----------|-------------------|-----------------|-------------------|----------------|
| 1.617 (match) | 1.617 | Fill | | | |
| 1.778 (16:9) | 1.617 | Letterbox sides | | | |
| 1.000 (1:1) | 1.617 | Letterbox top/bottom | | | |
| 1.333 (4:3) | 1.617 | Letterbox sides | | | |

**Decision Implications**:
- Confirms letterboxing behavior (vs. stretching)
- Quantifies letterbox impact for design guidance

---

### Experiment L2: Chart Sheet Embedding Behavior

**Bead:** `itv-slides-formatter-9s2`

**Hypothesis**: When embedding a chart sheet (no dimensions in Sheets), Slides uses some internal aspect ratio that we cannot control.

**Method**:

1. Create a bar chart and move to its own sheet
2. Embed into Slides with various container dimensions:
   - 16:9 container
   - 4:3 container
   - 1:1 container
   - Exact match to S1-discovered AR (if any)
3. For each embedding, visually inspect and measure letterboxing
4. Fetch contentUrl for each and compare image dimensions

**Observations to Record**:

| Container AR | Chart Sheet Type | Letterbox Present? | Letterbox Location | Apparent Chart AR |
|--------------|------------------|--------------------|--------------------|-------------------|
| 1.778 (16:9) | Bar | | | |
| 1.333 (4:3) | Bar | | | |
| 1.000 (1:1) | Bar | | | |
| 1.778 (16:9) | Pie | | | |
| 1.333 (4:3) | Pie | | | |
| 1.000 (1:1) | Pie | | | |

**Key Question**: Is the apparent chart AR consistent across container sizes? If yes, we've discovered the chart sheet's "native" AR. If no, the behavior is more complex.

**Decision Implications**:
- Determines viability of chart sheet strategy
- Identifies per-type AR patterns if they exist

---

### Experiment L3: Refresh Behavior After Container Resize

**Bead:** `itv-slides-formatter-dw9`

**Hypothesis**: After manually (or programmatically) resizing an embedded chart's container in Slides, `RefreshSheetsChartRequest` may or may not respect the new dimensions.

**Method**:

1. Embed a linked chart with specific container dimensions
2. Record container dimensions via API
3. Resize container via UI (drag handle) to significantly different dimensions
4. Record new container dimensions via API
5. Modify the source chart in Sheets (change a data value)
6. Call `RefreshSheetsChartRequest`:
   ```javascript
   function refreshChart(presentationId, chartObjectId) {
     return Slides.Presentations.batchUpdate({
       requests: [{
         refreshSheetsChart: {
           objectId: chartObjectId
         }
       }]
     }, presentationId);
   }
   ```
7. Record container dimensions via API after refresh
8. Visually inspect - did data update? Did dimensions change?

**Observations to Record**:

| Step | Width (EMU) | Height (EMU) | AR | Visual State |
|------|-------------|--------------|-----|--------------|
| Initial embed | | | | |
| After UI resize | | | | |
| After refresh | | | | |

**Key Questions**:
- Does refresh preserve user-resized dimensions?
- Does refresh reset to original dimensions?
- Does refresh re-fetch at new dimensions (less letterboxing)?

**Decision Implications**:
- If refresh preserves dimensions: User resizing is durable, we only need to remediate once
- If refresh resets dimensions: Every refresh undoes user changes, requiring post-refresh adjustment
- If refresh adapts: Best case, but need to understand the adaptation logic

---

### Experiment L4: LINKED vs NOT_LINKED_IMAGE Behavior

**Bead:** `itv-slides-formatter-4nr`

**Hypothesis**: NOT_LINKED_IMAGE creates a frozen static image that behaves differently than LINKED charts for sizing and refresh.

**Method**:

1. Embed same chart twice - once LINKED, once NOT_LINKED_IMAGE:
   ```javascript
   // LINKED
   embedChart(presId, slide1, ssId, chartId, width, height, 'LINKED');

   // NOT_LINKED_IMAGE
   Slides.Presentations.batchUpdate({
     requests: [{
       createSheetsChart: {
         spreadsheetId: ssId,
         chartId: chartId,
         linkingMode: 'NOT_LINKED_IMAGE',
         elementProperties: { ... }
       }
     }]
   }, presId);
   ```
2. Inspect both via API - what differs in the PageElement structure?
3. Resize both containers via UI
4. Attempt refresh on both:
   ```javascript
   // This should succeed for LINKED
   refreshChart(presId, linkedChartObjectId);

   // This should fail for NOT_LINKED_IMAGE
   refreshChart(presId, unlinkedChartObjectId);
   ```
5. Modify source data in Sheets
6. Attempt refresh again - observe behavior

**Observations to Record**:

| Aspect | LINKED | NOT_LINKED_IMAGE |
|--------|--------|------------------|
| PageElement type | SheetsChart | Image? SheetsChart? |
| Has contentUrl? | | |
| Has spreadsheetId reference? | | |
| Refresh succeeds? | | |
| Data change reflected after refresh? | | |
| Resize behavior (stretch vs letterbox) | | |

**Decision Implications**:
- Confirms NOT_LINKED_IMAGE limitations
- May reveal useful static image behaviors for specific use cases

---

### Experiment L5: contentUrl Image Resolution

**Bead:** `itv-slides-formatter-3wv`

**Hypothesis**: The contentUrl in a SheetsChart element provides an image at a specific resolution, which may or may not relate to container dimensions.

**Method**:

1. Embed same chart at three different container sizes:
   - Small: 2000000 × 1238390 EMU (~2.2" × 1.35")
   - Medium: 4000000 × 2476780 EMU (~4.4" × 2.7")
   - Large: 8000000 × 4953560 EMU (~8.7" × 5.4")
2. For each, fetch the contentUrl
3. Download each image and measure pixel dimensions
4. Compare image resolutions

**Observations to Record**:

| Container Size | Container Width (EMU) | Container Height (EMU) | Image Width (px) | Image Height (px) | Pixels per EMU |
|----------------|----------------------|------------------------|------------------|-------------------|----------------|
| Small | 2000000 | 1238390 | | | |
| Medium | 4000000 | 2476780 | | | |
| Large | 8000000 | 4953560 | | | |

**Key Question**: Does Google render higher-resolution images for larger containers, or does it render at a fixed resolution and scale?

**Decision Implications**:
- Affects image quality at large container sizes
- May inform optimal container sizing for print/export

---

## Golden Document Analysis (G-Series)

**Status: DEFERRED** — Requires golden documents from ITV design team.

These experiments reverse-engineer "golden" reference documents—well-designed presentations and charts that represent the target state. By enumerating every property and attempting programmatic recreation, we surface:
- API ceilings (what can't be set programmatically)
- Tacit design knowledge (defaults designers rely on without documenting)
- Template hygiene issues (misused placeholders, inconsistent inheritance)
- Opportunities for template purification

### Prerequisites

Obtain from ITV design/brand team:
1. **Golden Slides deck**: A presentation considered "correctly formatted"
2. **Golden Sheets charts**: Source spreadsheets for embedded charts
3. **Brand spec documentation**: Formal guidelines (colors, fonts, sizes)
4. **Designer access**: Ability to ask "was this intentional?" when we find anomalies

### G-Series Experiments (to be detailed when prerequisites met)

- **G1**: Slides Property Enumeration
- **G2**: Slides Recreation Attempt
- **G3**: Sheets Chart Property Enumeration
- **G4**: Sheets Chart Recreation Attempt
- **G5**: Template Purification

---

## Execution Checklist

### Phase 1 Execution Order (S and L Series)

Run experiments in this order (dependencies noted):

**Week 1: Foundational API Behavior**
1. **S2** (`bwb`) - Floating chart dimension control - foundational capability
2. **S4** (`sev`) - Move to own sheet via API - required for chart sheet strategy
3. **S1** (`8ke`) - Chart sheet aspect ratio discovery - depends on S4
4. **S3** (`gmp`) - Chart styling API coverage - independent, can run in parallel

**Week 2: Linking Behavior**
5. **L1** (`f51`) - Embedding aspect ratio behavior - foundational for Slides integration
6. **L2** (`9s2`) - Chart sheet embedding behavior - depends on S1, S4
7. **L3** (`dw9`) - Refresh after resize - critical architectural decision
8. **L4** (`4nr`) - LINKED vs NOT_LINKED_IMAGE - informational
9. **L5** (`3wv`) - contentUrl resolution - informational

### Prerequisites Checklist

Before starting experiments:
- [x] Test spreadsheet created (`ITV_Chart_Experiments`)
- [x] Test presentation created (`ITV_Slides_Experiments`)
- [ ] Sample data populated
- [ ] Test charts created (one of each type)
- [ ] OAuth scopes verified
- [ ] Utility functions deployed and tested

Before G-series experiments:
- [ ] Golden Slides deck obtained from design team
- [ ] Golden Sheets charts obtained (source spreadsheets)
- [ ] Brand spec documentation obtained
- [ ] Designer contact established for "was this intentional?" questions

### Recording Template

For each experiment, record findings in `RAGE.../Slides API Experiments/Findings/`:

```markdown
## Experiment [ID]: [Name]

**Date**: YYYY-MM-DD
**Executor**: [Name/Claude instance]
**Environment**: [Spreadsheet ID, Presentation ID]

### Setup
- [Any deviations from protocol]
- [Test data specifics]

### Raw Observations
[Paste actual API responses, measurements, screenshots]

### Summary Table
[Completed version of the observation table]

### Findings
- [Key finding 1]
- [Key finding 2]

### Surprises / Anomalies
- [Anything unexpected]

### Architectural Implications
- [How this affects the build plan]
```

---

## Codex of Gremlins: Chart Edition

This section will be populated with confirmed behaviors after experiments complete.

### Known (Pre-Experiment)

| Behavior | Source | Confidence |
|----------|--------|------------|
| Floating charts default to 600×371 pixels | Documentation | High |
| Charts letterbox when AR mismatches container | Documentation | High |
| RefreshSheetsChartRequest has no size parameters | API Reference | High |
| Chart sheets have no stored dimensions | API Reference | High |

### Discovered: API Behavior (Post S/L-Series)

| Behavior | Source | Experiment | Confidence |
|----------|--------|------------|------------|
| [To be filled] | | | |

### Discovered: Tacit Design Standards (Post G-Series)

| Standard | Formal Spec? | Observed In | Intentional? | Action |
|----------|--------------|-------------|--------------|--------|
| [To be filled from G1, G3] | | | | |

### API Ceiling: Confirmed UI-Only Properties

| Property | Domain | Experiment | Workaround |
|----------|--------|------------|------------|
| [To be filled from G2, G4] | Slides/Sheets | | |

### Template Hygiene Issues Discovered

| Issue Type | Example | Frequency | Fix Available? |
|------------|---------|-----------|----------------|
| Placeholder type mismatch | | | |
| Inheritance violation | | | |
| Font inconsistency | | | |
| [To be filled from G5] | | | |

---

## Post-Experiment: Decision Matrix

After completing experiments, fill in this matrix to guide implementation:

### API Behavior Decisions (from S/L-Series)

| Decision | Options | Experiment Result | Chosen Approach | Rationale |
|----------|---------|-------------------|-----------------|-----------|
| Chart source format | Floating vs Chart Sheet | L2, S1 | | |
| Dimension control strategy | Pre-size source vs Accept letterbox | S2, L1 | | |
| Post-refresh handling | Verify dimensions vs Trust refresh | L3 | | |
| Styling approach | Full API vs API + Templates | S3 | | |
| Linking mode | LINKED vs NOT_LINKED_IMAGE | L4 | | |

### Template Strategy Decisions (from G-Series)

| Decision | Options | Experiment Result | Chosen Approach | Rationale |
|----------|---------|-------------------|-----------------|-----------|
| Template purification | Fix existing vs Create new pure template | G5 | | |
| Handling UI-only properties | Document for users vs Pre-style templates | G2, G4 | | |
| Placeholder corrections | Fix in master vs Work around | G1 | | |
| Inheritance enforcement | Clear overrides programmatically vs Educate designers | G1, G5 | | |
| Chart template library | Create standard templates vs Style ad-hoc | G3, G4 | | |

### Discovered Standards to Codify

| Standard | Source | Formalize In Spec? | Enforce In Formatter? |
|----------|--------|-------------------|----------------------|
| [From G1, G3] | | | |

---

## Appendix: Quick Reference

### EMU Conversions
```
914400 EMU = 1 inch
9525 EMU = 1 pixel (at 96 DPI)
12700 EMU = 1 point

Common dimensions:
600 pixels = 5,715,000 EMU
371 pixels = 3,534,525 EMU
960 pixels = 9,144,000 EMU
540 pixels = 5,143,500 EMU
```

### Chart Type Constants
```javascript
const CHART_TYPES = [
  'BAR',
  'LINE',
  'AREA',
  'COLUMN',
  'SCATTER',
  'COMBO',
  'PIE',
  'HISTOGRAM',
  'ORG',
  'TREEMAP',
  'WATERFALL',
  'RADAR'
];
```

### Aspect Ratio Reference
```
16:9 = 1.778
4:3  = 1.333
1:1  = 1.000
Golden = 1.618
Sheets default = 1.617 (600/371)
```
