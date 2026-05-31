const CONFIG = {
  uploadSheetName: "Form Responses 1",
  reviewSheetName: "Form Responses 2",

  form2Id: "<FORM 2 ID>",

  timestampCol: 1, // A
  fileUrlCol: 2,   // B
  valueCol: 3,     // C

  startingValue: 40,

  form2AmountUsedQuestionTitle: "Amount used",
  allOptionText: "All"
};

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (sheetName === CONFIG.uploadSheetName) {
    handleScreenshotFormSubmit(e);
  }

  if (sheetName === CONFIG.reviewSheetName) {
    handleForm2Submit(e);
  }
}

function handleScreenshotFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();

  const valueCell = sheet.getRange(row, CONFIG.valueCol);
  const value = toNumber(valueCell.getValue());

  if (value === null) {
    valueCell.setValue(CONFIG.startingValue);
  }

  updateFormWithOldestImage();
}

function updateFormWithOldestImage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.uploadSheetName);
  const data = sheet.getDataRange().getValues();

  let oldest = null;
  let cardsRemainingAfterCurrent = 0;

  for (let i = 1; i < data.length; i++) {
    const timestamp = data[i][CONFIG.timestampCol - 1];
    const fileUrl = data[i][CONFIG.fileUrlCol - 1];

    let valueRemaining = toNumber(data[i][CONFIG.valueCol - 1]);

    if (!timestamp || !fileUrl) continue;

    if (valueRemaining === null) {
      valueRemaining = CONFIG.startingValue;
      sheet.getRange(i + 1, CONFIG.valueCol).setValue(valueRemaining);
    }

    if (valueRemaining <= 0) continue;

    const card = {
      row: i + 1,
      timestamp,
      fileUrl,
      valueRemaining
    };

    if (!oldest || timestamp < oldest.timestamp) {
      if (oldest) cardsRemainingAfterCurrent++;
      oldest = card;
    } else {
      cardsRemainingAfterCurrent++;
    }
  }

  const form = FormApp.openById(CONFIG.form2Id);
  const imageItem = getOrCreateImageItem(form);

  if (!oldest) {
    const form = FormApp.openById(CONFIG.form2Id);
    const imageItem = getOrCreateImageItem(form);

    imageItem
      .setTitle("No screenshots remaining")
      .setImage(Utilities.newBlob("", "image/png"));

    PropertiesService.getScriptProperties().deleteProperty("CURRENT_SCREENSHOT_ROW");
    return;
  }

  const fileId = extractFileId(oldest.fileUrl);
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();

imageItem
  .setTitle(
    `Oldest voucher — $${oldest.valueRemaining} remaining\n` +
    `${cardsRemainingAfterCurrent} voucher(s) remaining after this one`
  )
  .setImage(blob);

  PropertiesService.getScriptProperties().setProperty(
    "CURRENT_SCREENSHOT_ROW",
    String(oldest.row)
  );
}

function handleForm2Submit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uploadSheet = ss.getSheetByName(CONFIG.uploadSheetName);
  const reviewSheet = e.range.getSheet();

  const currentRow = Number(
    PropertiesService.getScriptProperties().getProperty("CURRENT_SCREENSHOT_ROW")
  );

  if (!currentRow) return;

  const submittedRow = e.range.getRow();
  const headers = reviewSheet
    .getRange(1, 1, 1, reviewSheet.getLastColumn())
    .getValues()[0];

  const values = reviewSheet
    .getRange(submittedRow, 1, 1, reviewSheet.getLastColumn())
    .getValues()[0];

  let amountUsed = null;
  let usedAll = false;

  headers.forEach((header, index) => {
    if (String(header).toLowerCase().includes(CONFIG.amountUsedQuestionTitle.toLowerCase())) {
      const answer = String(values[index]).trim();

      if (answer.toLowerCase() === CONFIG.allOptionText.toLowerCase()) {
        usedAll = true;
      } else {
        const parsed = toNumber(answer);
        if (parsed !== null) {
          amountUsed = parsed;
        }
      }
    }
  });

  const valueCell = uploadSheet.getRange(currentRow, CONFIG.valueCol);
  let currentValue = toNumber(valueCell.getValue());

  if (currentValue === null) {
    currentValue = CONFIG.startingValue;
  }

  if (usedAll) {
    valueCell.setValue(0);
  } else if (amountUsed !== null) {
    valueCell.setValue(Math.max(0, currentValue - amountUsed));
  }

  updateFormWithOldestImage();
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;

  const cleaned = String(value).replace("$", "").trim();
  const number = Number(cleaned);

  return isNaN(number) ? null : number;
}

function getOrCreateImageItem(form) {
  const imageItems = form.getItems(FormApp.ItemType.IMAGE);

  if (imageItems.length > 0) {
    return imageItems[0].asImageItem();
  }

  return form.addImageItem();
}

function extractFileId(url) {
  const text = String(url);

  const patterns = [
    /\/file\/d\/([-\w]{25,})/,
    /id=([-\w]{25,})/,
    /[-\w]{25,}/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }

  throw new Error(`Could not extract file ID from URL: ${url}`);
}

function handleForm2Submit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uploadSheet = ss.getSheetByName(CONFIG.uploadSheetName);
  const reviewSheet = e.range.getSheet();

  const currentRow = Number(
    PropertiesService.getScriptProperties().getProperty("CURRENT_SCREENSHOT_ROW")
  );

  Logger.log("Current screenshot row: " + currentRow);

  if (!currentRow) return;

  const submittedRow = e.range.getRow();

  const headers = reviewSheet
    .getRange(1, 1, 1, reviewSheet.getLastColumn())
    .getValues()[0];

  const values = reviewSheet
    .getRange(submittedRow, 1, 1, reviewSheet.getLastColumn())
    .getValues()[0];

  Logger.log("Headers: " + JSON.stringify(headers));
  Logger.log("Values: " + JSON.stringify(values));

  let amountUsed = null;
  let usedAll = false;

  headers.forEach((header, index) => {
    const answer = String(values[index]).trim();

    Logger.log(`Header: ${header}, Answer: ${answer}`);

    if (String(header).toLowerCase().includes("amount used")) {
      if (answer.toLowerCase() === "all") {
        usedAll = true;
      } else {
        const parsed = toNumber(answer);
        if (parsed !== null) {
          amountUsed = parsed;
        }
      }
    }
  });

  Logger.log("usedAll: " + usedAll);
  Logger.log("amountUsed: " + amountUsed);

  const valueCell = uploadSheet.getRange(currentRow, CONFIG.valueCol);
  let currentValue = toNumber(valueCell.getValue());

  if (currentValue === null) {
    currentValue = CONFIG.startingValue;
  }

  Logger.log("currentValue before update: " + currentValue);

  if (usedAll) {
    valueCell.setValue(0);
  } else if (amountUsed !== null) {
    valueCell.setValue(Math.max(0, currentValue - amountUsed));
  }

  Logger.log("newValue after update: " + valueCell.getValue());

  updateFormWithOldestImage();
}
