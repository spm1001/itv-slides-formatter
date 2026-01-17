/**
 * Experimental Utility Functions
 *
 * Support functions for the S-series and L-series experiments.
 * See docs/experimental-protocol.md for full protocol.
 *
 * Test Environment:
 * - Spreadsheet: 1uVNby-sLTDIyozwrzAXpgLWlkweIe4L94nWZZvcmps4
 * - Presentation: 1jCr7vmCg_XciYFbxX9oy4VM9OnPqkjfJj7Bbt2X2pwU
 */

const EXPERIMENT_SPREADSHEET_ID = '1uVNby-sLTDIyozwrzAXpgLWlkweIe4L94nWZZvcmps4';
const EXPERIMENT_PRESENTATION_ID = '1jCr7vmCg_XciYFbxX9oy4VM9OnPqkjfJj7Bbt2X2pwU';

/**
 * Utility: Get chart dimensions from Sheets (floating charts only)
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} chartId - The chart ID
 * @returns {Object} Chart dimension info
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
 * @param {string} presentationId - The presentation ID
 * @param {string} chartObjectId - The chart object ID in Slides
 * @returns {Object} Embedded chart info
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
 * @param {Object} size - The size object with width/height
 * @param {Object} transform - The transform object with scaleX/scaleY
 * @returns {Object} Effective dimensions in EMU
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
 * Utility: Fetch image and get basic info
 * Note: contentUrl expires after 30 minutes
 * @param {string} contentUrl - The content URL from sheetsChart
 * @returns {Object} Image info (blob, type, size)
 */
function fetchChartImage(contentUrl) {
  const response = UrlFetchApp.fetch(contentUrl);
  const blob = response.getBlob();
  return {
    blob: blob,
    contentType: blob.getContentType(),
    bytes: blob.getBytes().length
  };
}

/**
 * Utility: Export a chart as PNG and save to Drive
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} chartId - The chart ID
 * @param {string} filename - Optional filename (defaults to chart_<id>_export.png)
 * @returns {Object} DriveApp File object
 */
function exportChartImage(spreadsheetId, chartId, filename) {
  const chart = SpreadsheetApp.openById(spreadsheetId)
    .getCharts()
    .find(c => c.getChartId() === chartId);

  if (!chart) {
    throw new Error(`Chart ${chartId} not found in spreadsheet`);
  }

  const blob = chart.getAs('image/png');
  const name = filename || `chart_${chartId}_export.png`;
  const file = DriveApp.createFile(blob.setName(name));

  Logger.log(`Exported chart ${chartId} to: ${file.getUrl()}`);
  return file;
}

/**
 * Utility: Resize a floating chart
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} chartId - The chart ID
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 */
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

  Logger.log(`Resized chart ${chartId} to ${width}x${height}`);
}

/**
 * Utility: Move a chart to its own sheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} chartId - The chart ID
 * @returns {Object} Response from batchUpdate
 */
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

  Logger.log(`Moved chart ${chartId} to own sheet`);
  return response;
}

/**
 * Utility: Embed a chart from Sheets into Slides
 * @param {string} presentationId - The presentation ID
 * @param {string} slideId - The slide object ID
 * @param {string} spreadsheetId - The source spreadsheet ID
 * @param {number} chartId - The chart ID
 * @param {number} widthEmu - Width in EMU
 * @param {number} heightEmu - Height in EMU
 * @param {string} linkingMode - 'LINKED' or 'NOT_LINKED_IMAGE'
 * @returns {Object} Response from batchUpdate
 */
function embedChart(presentationId, slideId, spreadsheetId, chartId, widthEmu, heightEmu, linkingMode) {
  return Slides.Presentations.batchUpdate({
    requests: [{
      createSheetsChart: {
        spreadsheetId: spreadsheetId,
        chartId: chartId,
        linkingMode: linkingMode || 'LINKED',
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

/**
 * Utility: Refresh an embedded chart
 * @param {string} presentationId - The presentation ID
 * @param {string} chartObjectId - The chart object ID in Slides
 * @returns {Object} Response from batchUpdate
 */
function refreshChart(presentationId, chartObjectId) {
  return Slides.Presentations.batchUpdate({
    requests: [{
      refreshSheetsChart: {
        objectId: chartObjectId
      }
    }]
  }, presentationId);
}

/**
 * Utility: List all charts in a spreadsheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @returns {Array} Array of chart info objects
 */
function listCharts(spreadsheetId) {
  const ss = Sheets.Spreadsheets.get(spreadsheetId);
  const charts = [];

  for (const sheet of ss.sheets) {
    const sheetName = sheet.properties.title;
    for (const chart of sheet.charts || []) {
      const info = {
        chartId: chart.chartId,
        sheetName: sheetName,
        chartType: chart.spec?.basicChart?.chartType || chart.spec?.pieChart ? 'PIE' : 'UNKNOWN'
      };

      if (chart.position.overlayPosition) {
        info.position = 'FLOATING';
        info.width = chart.position.overlayPosition.widthPixels;
        info.height = chart.position.overlayPosition.heightPixels;
        info.aspectRatio = info.width / info.height;
      } else {
        info.position = 'CHART_SHEET';
        info.chartSheetId = chart.position.sheetId;
      }

      charts.push(info);
    }
  }

  return charts;
}

/**
 * Utility: List all embedded charts in a presentation
 * @param {string} presentationId - The presentation ID
 * @returns {Array} Array of embedded chart info
 */
function listEmbeddedCharts(presentationId) {
  const pres = Slides.Presentations.get(presentationId);
  const charts = [];

  for (let slideIdx = 0; slideIdx < pres.slides.length; slideIdx++) {
    const slide = pres.slides[slideIdx];
    for (const element of slide.pageElements || []) {
      if (element.sheetsChart) {
        charts.push({
          slideIndex: slideIdx,
          slideId: slide.objectId,
          objectId: element.objectId,
          spreadsheetId: element.sheetsChart.spreadsheetId,
          chartId: element.sheetsChart.chartId,
          size: element.size,
          transform: element.transform,
          effectiveDimensions: getEffectiveDimensions(element.size, element.transform)
        });
      }
    }
  }

  return charts;
}

// ============ EMU Conversion Helpers ============

const EMU_PER_INCH = 914400;
const EMU_PER_PIXEL = 9525;  // at 96 DPI
const EMU_PER_POINT = 12700;

function pixelsToEmu(pixels) {
  return pixels * EMU_PER_PIXEL;
}

function emuToPixels(emu) {
  return emu / EMU_PER_PIXEL;
}

function inchesToEmu(inches) {
  return inches * EMU_PER_INCH;
}

function emuToInches(emu) {
  return emu / EMU_PER_INCH;
}

// ============ Setup Functions ============

/**
 * Populate the test spreadsheet with sample data and create a bar chart
 * Run this once to set up the experimental environment
 */
function setupExperimentData() {
  const ss = SpreadsheetApp.openById(EXPERIMENT_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('TestData');

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('TestData');
  }

  // Clear existing data
  sheet.clear();

  // Add headers and sample data
  const data = [
    ['Month', 'Revenue', 'Costs'],
    ['Jan', 100, 80],
    ['Feb', 120, 85],
    ['Mar', 115, 90],
    ['Apr', 140, 95],
    ['May', 160, 100],
    ['Jun', 155, 105]
  ];

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  // Format headers
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');

  // Create a bar chart
  const chartBuilder = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange('A1:C7'))
    .setPosition(10, 1, 0, 0)
    .setOption('title', 'Revenue vs Costs')
    .setOption('width', 600)
    .setOption('height', 371);

  const chart = chartBuilder.build();
  sheet.insertChart(chart);

  Logger.log('Setup complete. Created TestData sheet with sample data and bar chart.');
  Logger.log('Spreadsheet: https://docs.google.com/spreadsheets/d/' + EXPERIMENT_SPREADSHEET_ID);

  // List charts to confirm
  const charts = listCharts(EXPERIMENT_SPREADSHEET_ID);
  Logger.log('Charts in spreadsheet: ' + JSON.stringify(charts, null, 2));

  return { success: true, charts: charts };
}

// ============ Test Runners ============

/**
 * Quick test: List all charts in the experiment spreadsheet
 */
function testListCharts() {
  const charts = listCharts(EXPERIMENT_SPREADSHEET_ID);
  Logger.log('Charts found: ' + JSON.stringify(charts, null, 2));
  return charts;
}

/**
 * Quick test: List all embedded charts in the experiment presentation
 */
function testListEmbeddedCharts() {
  const charts = listEmbeddedCharts(EXPERIMENT_PRESENTATION_ID);
  Logger.log('Embedded charts found: ' + JSON.stringify(charts, null, 2));
  return charts;
}
