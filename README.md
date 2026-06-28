# Google Forms Voucher Redemption Queue

A Google Apps Script solution that creates a first-in, first-out (FIFO) queue for voucher redemption using two Google Forms and a Google Sheet.

## Overview

This project manages voucher screenshots submitted through a Google Form. Each submitted voucher begins with a configurable value (default: **$40**) and is placed into a redemption queue based on submission time.

A second Google Form always displays the **oldest available voucher**. When a redemption is submitted, the remaining balance is updated. Once a voucher reaches **$0**, it is automatically removed from the queue and the next oldest voucher is displayed.

## Features

* Upload voucher screenshots through Google Forms
* Automatic timestamping
* FIFO redemption queue
* Tracks remaining balance for each voucher
* Automatically rotates to the next oldest voucher
* Supports full redemption ("All")
* Displays:
* 
  * Current voucher image
  * Current remaining balance
  * Number of vouchers remaining in the queue after the current voucher
* Automatically hides the image when no vouchers remain

---

## Architecture

```text
        Form 1
  (voucher Upload)
          │
          ▼
 Google Drive (images)
          │
          ▼
 Google Sheet
 ┌─────────────────────────┐
 │ Timestamp               │
 │ File URL                │
 │ Value Remaining         │
 └─────────────────────────┘
          │
          ▼
 Google Apps Script
          │
          ▼
        Form 2
   (voucher Redemption)
```

---

## Google Sheet Layout

### Form Responses 1

| Column | Description         |
| ------ | ------------------- |
| A      | Timestamp           |
| B      | (Other form fields) |
| C      | File URL            |
| D      | Value Remaining     |

The script assumes:

* Timestamp = Column A
* File URL = Column C
* Value Remaining = Column D

These values can be changed in the `CONFIG` object.

---

## Form 1

Purpose:

* Upload a voucher screenshot.

Requirements:

* File Upload question
* Responses linked to the same spreadsheet as Form 2

When submitted:

* Value Remaining is initialized to `$40`
* Queue is refreshed

---

## Form 2

Purpose:

Redeem the oldest available voucher.

Contains:

### Image Item

Displays the oldest active voucher.

### Multiple Choice Question

**Amount used**

Options:

* All
* Other

If **All** is selected:

* Remaining balance becomes `0`.

If **Other** is selected:

* Enter the dollar amount used.
* Remaining balance becomes:

```
Current Remaining - Amount Used
```

---

## Queue Logic

The queue always selects:

* Oldest timestamp
* Value Remaining > 0

When Value Remaining reaches 0:

* Voucher leaves the queue
* Next oldest voucher is displayed automatically

---

## Configuration

Edit the `CONFIG` object:

```javascript
const CONFIG = {
  uploadSheetName: "Form Responses 1",
  reviewSheetName: "Form Responses 2",

  form2Id: "YOUR_FORM_ID",

  timestampCol: 1,
  fileUrlCol: 3,
  valueCol: 4,

  startingValue: 40,

  amountUsedQuestionTitle: "Amount used",
  allOptionText: "All"
};
```

---

## Installation

### 1. Create Form 1

Include:

* File Upload question

Link responses to a Google Sheet.

---

### 2. Create Form 2

Include:

* Image Item
* Multiple Choice question:

  * All
  * Other

Link responses to the **same spreadsheet**.

---

### 3. Open Apps Script

From the spreadsheet:

```
Extensions
→ Apps Script
```

Paste the contents of VoucherHandler.gs.

---

### 4. Configure

Replace:

```javascript
form2Id: "YOUR_FORM_ID"
```

with your Form 2 ID.

---

### 5. Authorize

Run once:

```javascript
updateFormWithOldestImage();
```

Accept the requested Google permissions.

---

### 6. Create Trigger

Create **one** trigger.

Function:

```
onFormSubmit
```

Event source:

```
From spreadsheet
```

Event type:

```
On form submit
```

Optionally create a second trigger:

Function:

```
updateFormWithOldestImage
```

Event source:

```
Time-driven
```

Every:

```
5–10 minutes
```

This acts as a backup refresh.

---

## Workflow

1. User uploads a voucher.
2. Script initializes remaining value to `$40`.
3. Form 2 updates to display the oldest available voucher.
4. User redeems part or all of the voucher.
5. Remaining value is updated.
6. When value reaches `$0`, the next oldest voucher becomes active.
7. If no vouchers remain, Form 2 removes the image.

---

## Notes

* Google Forms cannot dynamically display images per respondent.
* The form itself is updated whenever the queue changes.
* Images must remain accessible in Google Drive.
* Both forms must write responses to the same spreadsheet.

---

## Future Improvements

* Configurable starting value
* Multi-user locking to prevent simultaneous redemption
* Admin dashboard
* Audit history
* Email or Slack notifications
* Automatic archival of fully redeemed vouchers
* Support for multiple redemption queues

---

## License

MIT License
