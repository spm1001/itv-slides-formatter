function onOpen() {
  createMenu();
}

function createMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Slide Formatter')
    .addItem('Format Presentation', 'formatPresentation')
    .addItem('Settings', 'showSettings')
    .addToUi();
}

function formatPresentation() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Format Presentation',
      'Enter the Google Slides presentation URL:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const presentationUrl = response.getResponseText().trim();
      
      if (!presentationUrl) {
        ui.alert('Error', 'Please enter a valid presentation URL.', ui.ButtonSet.OK);
        return;
      }
      
      const presentationId = extractPresentationId(presentationUrl);
      if (!presentationId) {
        ui.alert('Error', 'Invalid presentation URL format.', ui.ButtonSet.OK);
        return;
      }
      
      showProgressDialog();
      
      processPresentation(presentationId);
      
      ui.alert('Success', 'Presentation formatting completed!', ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.log('Error in formatPresentation: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error', 'An error occurred: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function processPresentation(presentationId) {
  const config = getConfigWithPersistedToggleMode(presentationId);
  const formatter = new SlideFormatter(config);
  return formatter.formatPresentation(presentationId);
}

function extractPresentationId(url) {
  const regex = /\/presentation\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function testFontSwap() {
  const testPresentationId = '1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA';
  
  try {
    Logger.log('Starting font swap test...');
    const result = processPresentation(testPresentationId);
    Logger.log('Font swap test completed successfully');
    Logger.log('Results: ' + JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('Font swap test failed: ' + error.toString());
    throw error;
  }
}

function simpleTest() {
  return {
    message: 'Hello from Apps Script!',
    timestamp: new Date().toISOString(),
    success: true
  };
}

/**
 * Enumerate everything on a specific slide
 */
function enumerateSlide(slideIndex) {
  const testPresentationId = '1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA';
  const idx = slideIndex || 1; // Default to second slide (0-indexed)

  Logger.log(`=== ENUMERATING SLIDE ${idx + 1} ===`);

  try {
    const presentation = Slides.Presentations.get(testPresentationId);

    if (idx >= presentation.slides.length) {
      Logger.log(`❌ Slide ${idx + 1} doesn't exist (only ${presentation.slides.length} slides)`);
      return { success: false, error: 'Slide index out of range' };
    }

    const slide = presentation.slides[idx];
    Logger.log(`Slide ID: ${slide.objectId}`);

    const elements = [];

    if (slide.pageElements) {
      Logger.log(`\nFound ${slide.pageElements.length} elements:\n`);

      slide.pageElements.forEach((el, i) => {
        const info = {
          index: i,
          objectId: el.objectId,
          type: getElementTypeName(el),
          size: el.size ? {
            width: el.size.width ? Math.round(el.size.width.magnitude) : 0,
            height: el.size.height ? Math.round(el.size.height.magnitude) : 0
          } : null,
          position: el.transform ? {
            x: Math.round(el.transform.translateX || 0),
            y: Math.round(el.transform.translateY || 0)
          } : null
        };

        // Add type-specific details
        if (el.shape) {
          info.shapeType = el.shape.shapeType;
          if (el.shape.placeholder) {
            info.placeholder = el.shape.placeholder.type;
          }
          if (el.shape.text && el.shape.text.textElements) {
            const textContent = el.shape.text.textElements
              .filter(te => te.textRun)
              .map(te => te.textRun.content)
              .join('')
              .trim()
              .substring(0, 50);
            info.text = textContent + (textContent.length >= 50 ? '...' : '');
          }
        }

        if (el.image) {
          info.sourceUrl = el.image.sourceUrl ? '(has source)' : '(embedded)';
        }

        if (el.table) {
          info.tableSize = `${el.table.rows}×${el.table.columns}`;
        }

        if (el.line) {
          info.lineType = el.line.lineType;
        }

        if (el.sheetsChart) {
          info.chartId = el.sheetsChart.chartId;
          info.spreadsheetId = el.sheetsChart.spreadsheetId;
        }

        elements.push(info);

        Logger.log(`[${i}] ${info.type} (${info.objectId})`);
        Logger.log(`    Position: (${info.position?.x}, ${info.position?.y}) EMU`);
        Logger.log(`    Size: ${info.size?.width} × ${info.size?.height} EMU`);
        if (info.shapeType) Logger.log(`    Shape: ${info.shapeType}`);
        if (info.placeholder) Logger.log(`    Placeholder: ${info.placeholder}`);
        if (info.text) Logger.log(`    Text: "${info.text}"`);
        if (info.tableSize) Logger.log(`    Table: ${info.tableSize}`);
        if (info.lineType) Logger.log(`    Line: ${info.lineType}`);
        Logger.log('');
      });
    } else {
      Logger.log('No elements on this slide');
    }

    return {
      success: true,
      slideId: slide.objectId,
      slideIndex: idx,
      elementCount: elements.length,
      elements: elements
    };

  } catch (error) {
    Logger.log(`❌ ERROR: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

function getElementTypeName(el) {
  if (el.shape) return 'SHAPE';
  if (el.image) return 'IMAGE';
  if (el.table) return 'TABLE';
  if (el.line) return 'LINE';
  if (el.video) return 'VIDEO';
  if (el.wordArt) return 'WORD_ART';
  if (el.sheetsChart) return 'SHEETS_CHART';
  if (el.sectionBreak) return 'SECTION_BREAK';
  return 'UNKNOWN';
}

// Wrapper for remote execution (takes no args, enumerates slide 2)
function enumerateSlide2() {
  return enumerateSlide(1);
}

/**
 * Explore what we can read from the slide master/template
 */
function testReadMaster() {
  const testPresentationId = '1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA';

  Logger.log('=== MASTER TEMPLATE EXPLORATION ===');

  try {
    const presentation = Slides.Presentations.get(testPresentationId);
    Logger.log(`Presentation: ${presentation.title}`);

    // 1. Masters
    Logger.log(`\n=== MASTERS (${presentation.masters ? presentation.masters.length : 0}) ===`);
    if (presentation.masters) {
      for (let i = 0; i < presentation.masters.length; i++) {
        const master = presentation.masters[i];
        Logger.log(`\nMaster ${i + 1}: ${master.objectId}`);

        // Master properties
        if (master.masterProperties) {
          Logger.log(`  displayName: ${master.masterProperties.displayName || '(none)'}`);
        }

        // Page properties (background, color scheme)
        if (master.pageProperties) {
          Logger.log(`  pageProperties keys: ${JSON.stringify(Object.keys(master.pageProperties))}`);

          // Color scheme - THIS IS THE THEME PALETTE
          if (master.pageProperties.colorScheme) {
            Logger.log(`\n  === COLOR SCHEME (Theme Palette) ===`);
            const scheme = master.pageProperties.colorScheme;
            if (scheme.colors) {
              for (const colorEntry of scheme.colors) {
                // Dump raw structure to see what we're dealing with
                Logger.log(`    ${colorEntry.type}: ${JSON.stringify(colorEntry.color)}`);
              }
            }
          }
        }

        // Placeholders on master
        if (master.pageElements) {
          Logger.log(`\n  === MASTER PLACEHOLDERS ===`);
          for (const el of master.pageElements) {
            if (el.shape && el.shape.placeholder) {
              const ph = el.shape.placeholder;
              Logger.log(`    ${ph.type}: objId=${el.objectId}`);

              // Check text style on placeholder
              if (el.shape.text && el.shape.text.textElements) {
                for (const te of el.shape.text.textElements) {
                  if (te.textRun && te.textRun.style) {
                    const s = te.textRun.style;
                    Logger.log(`      font: ${s.fontFamily || '(inherited)'}, size: ${s.fontSize ? s.fontSize.magnitude + s.fontSize.unit : '(inherited)'}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Layouts
    Logger.log(`\n=== LAYOUTS (${presentation.layouts ? presentation.layouts.length : 0}) ===`);
    if (presentation.layouts) {
      for (const layout of presentation.layouts) {
        const props = layout.layoutProperties || {};
        Logger.log(`  ${props.displayName || '(unnamed)'}: ${layout.objectId}, masterObjectId: ${props.masterObjectId || '?'}`);
      }
    }

    // 3. Notemaster (speaker notes template)
    Logger.log(`\n=== NOTES MASTER ===`);
    if (presentation.notesMaster) {
      Logger.log(`  objectId: ${presentation.notesMaster.objectId}`);
      if (presentation.notesMaster.pageElements) {
        Logger.log(`  elements: ${presentation.notesMaster.pageElements.length}`);
      }
    } else {
      Logger.log(`  (none)`);
    }

    // 4. Page size
    Logger.log(`\n=== PAGE SIZE ===`);
    if (presentation.pageSize) {
      const w = presentation.pageSize.width;
      const h = presentation.pageSize.height;
      Logger.log(`  width: ${w.magnitude} ${w.unit}`);
      Logger.log(`  height: ${h.magnitude} ${h.unit}`);
    }

    return {
      success: true,
      masters: presentation.masters ? presentation.masters.length : 0,
      layouts: presentation.layouts ? presentation.layouts.length : 0,
      hasNotesMaster: !!presentation.notesMaster
    };

  } catch (error) {
    Logger.log(`❌ ERROR: ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return { success: false, error: error.toString() };
  }
}

// Helper to convert RGB (0-1 floats) to hex
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Create a slide illustrating grid unit options
 */
function testCreateGridSlide() {
  const testPresentationId = '1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA';

  const PAGE_WIDTH = 9144000;
  const PAGE_HEIGHT = 5143500;

  // Grid options to illustrate
  const grids = [
    { emu: 571500, cols: 16, rows: 9, label: '571,500 EMU (16×9) - 0.625"', color: { red: 0.8, green: 0.2, blue: 0.2 } },
    { emu: 285750, cols: 32, rows: 18, label: '285,750 EMU (32×18) - 0.31"', color: { red: 0.2, green: 0.6, blue: 0.2 } },
    { emu: 114300, cols: 80, rows: 45, label: '114,300 EMU (80×45) - ⅛"', color: { red: 0.2, green: 0.4, blue: 0.8 } },
  ];

  Logger.log('=== CREATING GRID ILLUSTRATION SLIDES ===');

  try {
    const requests = [];

    // Create slides for each grid
    grids.forEach((grid, gridIndex) => {
      const slideId = `grid_slide_${gridIndex}`;

      // Create a blank slide
      requests.push({
        createSlide: {
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: 'BLANK' }
        }
      });

      // Add title text box
      const titleId = `grid_title_${gridIndex}`;
      requests.push({
        createShape: {
          objectId: titleId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: { width: { magnitude: 8000000, unit: 'EMU' }, height: { magnitude: 400000, unit: 'EMU' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 572000, translateY: 100000, unit: 'EMU' }
          }
        }
      });
      requests.push({
        insertText: {
          objectId: titleId,
          text: grid.label
        }
      });
      requests.push({
        updateTextStyle: {
          objectId: titleId,
          style: { fontSize: { magnitude: 18, unit: 'PT' }, bold: true },
          fields: 'fontSize,bold'
        }
      });

      // Draw vertical lines (limit to avoid too many requests)
      const maxLines = 20;
      const colStep = Math.ceil(grid.cols / maxLines);
      for (let col = 0; col <= grid.cols; col += colStep) {
        const x = col * grid.emu;
        const lineId = `vline_${gridIndex}_${col}`;
        requests.push({
          createLine: {
            objectId: lineId,
            lineCategory: 'STRAIGHT',
            elementProperties: {
              pageObjectId: slideId,
              size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: PAGE_HEIGHT, unit: 'EMU' } },
              transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: 0, unit: 'EMU' }
            }
          }
        });
        requests.push({
          updateLineProperties: {
            objectId: lineId,
            lineProperties: {
              lineFill: { solidFill: { color: { rgbColor: grid.color }, alpha: 0.5 } },
              weight: { magnitude: 0.5, unit: 'PT' }
            },
            fields: 'lineFill,weight'
          }
        });
      }

      // Draw horizontal lines
      const rowStep = Math.ceil(grid.rows / maxLines);
      for (let row = 0; row <= grid.rows; row += rowStep) {
        const y = row * grid.emu;
        const lineId = `hline_${gridIndex}_${row}`;
        requests.push({
          createLine: {
            objectId: lineId,
            lineCategory: 'STRAIGHT',
            elementProperties: {
              pageObjectId: slideId,
              size: { width: { magnitude: PAGE_WIDTH, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: y, unit: 'EMU' }
            }
          }
        });
        requests.push({
          updateLineProperties: {
            objectId: lineId,
            lineProperties: {
              lineFill: { solidFill: { color: { rgbColor: grid.color }, alpha: 0.5 } },
              weight: { magnitude: 0.5, unit: 'PT' }
            },
            fields: 'lineFill,weight'
          }
        });
      }
    });

    Logger.log(`Sending ${requests.length} requests...`);
    const response = Slides.Presentations.batchUpdate({ requests: requests }, testPresentationId);
    Logger.log('✅ Grid slides created');

    return { success: true, slidesCreated: grids.length };

  } catch (error) {
    Logger.log(`❌ ERROR: ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Test reading and changing colors via Slides API
 * Tests: text foreground, shape fill, shape outline
 * Distinguishes between RGB and Theme Color references
 */
function testColorReadAndChange() {
  const testPresentationId = '1_WxqIvBQ2ArGjUqamVhVYKdAie5YrEgXmmUFMgNNpPA';

  Logger.log('=== COLOR READ/WRITE TEST (v2 - Theme Colors) ===');

  try {
    // 1. Get presentation and find elements
    const presentation = Slides.Presentations.get(testPresentationId);
    Logger.log(`Presentation: ${presentation.title}`);
    Logger.log(`Slides: ${presentation.slides.length}`);

    // Helper to classify color type
    function classifyColor(color) {
      if (!color) return { type: 'none', value: null };
      if (color.themeColor) return { type: 'theme', value: color.themeColor };
      if (color.rgbColor) return { type: 'rgb', value: color.rgbColor };
      return { type: 'unknown', value: color };
    }

    const colorReport = {
      textColors: [],
      shapeFills: [],
      shapeOutlines: [],
      summary: {
        themeColors: 0,
        rgbColors: 0,
        byThemeSlot: {}
      }
    };

    // 2. Read colors from all elements
    for (let slideIdx = 0; slideIdx < presentation.slides.length; slideIdx++) {
      const slide = presentation.slides[slideIdx];
      Logger.log(`\n--- Slide ${slideIdx + 1} ---`);

      if (!slide.pageElements) continue;

      for (const element of slide.pageElements) {
        const objId = element.objectId;

        // Check shape properties (fill, outline)
        if (element.shape) {
          const props = element.shape.shapeProperties;

          // Shape fill
          if (props && props.shapeBackgroundFill) {
            const fill = props.shapeBackgroundFill;
            if (fill.solidFill && fill.solidFill.color) {
              const color = fill.solidFill.color;
              const classified = classifyColor(color);
              Logger.log(`Shape ${objId} FILL [${classified.type}]: ${JSON.stringify(classified.value)}`);
              colorReport.shapeFills.push({ objId, color, classified, slideIdx });

              if (classified.type === 'theme') {
                colorReport.summary.themeColors++;
                colorReport.summary.byThemeSlot[classified.value] = (colorReport.summary.byThemeSlot[classified.value] || 0) + 1;
              } else if (classified.type === 'rgb') {
                colorReport.summary.rgbColors++;
              }
            }
          }

          // Shape outline
          if (props && props.outline && props.outline.outlineFill) {
            const outline = props.outline.outlineFill;
            if (outline.solidFill && outline.solidFill.color) {
              const color = outline.solidFill.color;
              const classified = classifyColor(color);
              Logger.log(`Shape ${objId} OUTLINE [${classified.type}]: ${JSON.stringify(classified.value)}`);
              colorReport.shapeOutlines.push({ objId, color, classified, slideIdx });

              if (classified.type === 'theme') {
                colorReport.summary.themeColors++;
                colorReport.summary.byThemeSlot[classified.value] = (colorReport.summary.byThemeSlot[classified.value] || 0) + 1;
              } else if (classified.type === 'rgb') {
                colorReport.summary.rgbColors++;
              }
            }
          }

          // Text foreground color
          if (element.shape.text && element.shape.text.textElements) {
            for (const te of element.shape.text.textElements) {
              if (te.textRun && te.textRun.style && te.textRun.style.foregroundColor) {
                const color = te.textRun.style.foregroundColor;
                const classified = classifyColor(color.opaqueColor || color);
                Logger.log(`Text in ${objId} FOREGROUND [${classified.type}]: ${JSON.stringify(classified.value)}`);
                colorReport.textColors.push({ objId, color, classified, slideIdx });

                if (classified.type === 'theme') {
                  colorReport.summary.themeColors++;
                  colorReport.summary.byThemeSlot[classified.value] = (colorReport.summary.byThemeSlot[classified.value] || 0) + 1;
                } else if (classified.type === 'rgb') {
                  colorReport.summary.rgbColors++;
                }
              }
            }
          }
        }
      }
    }

    Logger.log(`\n=== COLOR SUMMARY ===`);
    Logger.log(`Text colors found: ${colorReport.textColors.length}`);
    Logger.log(`Shape fills found: ${colorReport.shapeFills.length}`);
    Logger.log(`Shape outlines found: ${colorReport.shapeOutlines.length}`);
    Logger.log(`\n=== THEME vs RGB BREAKDOWN ===`);
    Logger.log(`Theme color references: ${colorReport.summary.themeColors}`);
    Logger.log(`RGB hardcoded colors: ${colorReport.summary.rgbColors}`);
    Logger.log(`Theme slots used: ${JSON.stringify(colorReport.summary.byThemeSlot)}`);

    // 3. Try to CHANGE a color using THEME reference
    // Find a shape with RGB and convert it to theme color
    const rgbShape = colorReport.shapeFills.find(s => s.classified.type === 'rgb');
    const themeShape = colorReport.shapeFills.find(s => s.classified.type === 'theme');

    if (rgbShape) {
      Logger.log(`\n=== TEST 1: Convert RGB to Theme Color ===`);
      Logger.log(`Target: ${rgbShape.objId} (slide ${rgbShape.slideIdx + 1})`);
      Logger.log(`Original: RGB ${JSON.stringify(rgbShape.classified.value)}`);
      Logger.log(`New: Theme ACCENT1`);

      const request1 = {
        requests: [{
          updateShapeProperties: {
            objectId: rgbShape.objId,
            shapeProperties: {
              shapeBackgroundFill: {
                solidFill: {
                  color: { themeColor: 'ACCENT1' }
                }
              }
            },
            fields: 'shapeBackgroundFill.solidFill.color'
          }
        }]
      };

      Slides.Presentations.batchUpdate(request1, testPresentationId);
      Logger.log(`✅ RGB → ACCENT1 succeeded`);
    }

    if (themeShape) {
      Logger.log(`\n=== TEST 2: Change Theme Slot ===`);
      Logger.log(`Target: ${themeShape.objId} (slide ${themeShape.slideIdx + 1})`);
      Logger.log(`Original: Theme ${themeShape.classified.value}`);

      // Toggle between ACCENT1 and ACCENT2
      const newSlot = themeShape.classified.value === 'ACCENT1' ? 'ACCENT2' : 'ACCENT1';
      Logger.log(`New: Theme ${newSlot}`);

      const request2 = {
        requests: [{
          updateShapeProperties: {
            objectId: themeShape.objId,
            shapeProperties: {
              shapeBackgroundFill: {
                solidFill: {
                  color: { themeColor: newSlot }
                }
              }
            },
            fields: 'shapeBackgroundFill.solidFill.color'
          }
        }]
      };

      Slides.Presentations.batchUpdate(request2, testPresentationId);
      Logger.log(`✅ Theme slot change succeeded`);
    }

    if (!rgbShape && !themeShape) {
      Logger.log(`⚠️ No shapes with fill found to test`);
    }

    return {
      success: true,
      message: 'Color read and change test passed',
      summary: colorReport.summary,
      colorsFound: {
        text: colorReport.textColors.length,
        fills: colorReport.shapeFills.length,
        outlines: colorReport.shapeOutlines.length
      }
    };

  } catch (error) {
    Logger.log(`❌ ERROR: ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}