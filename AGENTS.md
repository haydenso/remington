# Typewriter Application - Movement & Positioning Logic

## Overview

This typewriter application uses a **fixed cursor with moving paper** paradigm. The cursor stays in one place on the screen, and the paper moves underneath it to create the illusion of typing. This document explains all the interdependent systems that make this work.

---

## Critical Concept: The Fixed Cursor

**The cursor NEVER moves.** It's fixed at:
- **Vertical position**: `calc(50% + 220px)` (style.css:17)
- **Horizontal position**: `50%` (style.css:18)

Instead of moving the cursor, we move the entire paper container using CSS transforms. This is the foundation of how everything works.

---

## 1. Configuration Constants (main.js:4-10)

```javascript
const CONFIG = {
    charWidth: 10.8,        // Width of one character in pixels (measured dynamically)
    lineHeight: 25,         // Height of one line in pixels
    maxCharsPerLine: 55,    // Maximum characters before margin warning
    leftMargin: 96,         // Left margin of paper in pixels
    topMargin: 96          // Top margin of paper in pixels
};
```

### What Each Value Controls:

- **`charWidth`**: Dynamically measured at startup (main.js:40). Determines horizontal paper movement.
- **`lineHeight`**: MUST match CSS `line-height` (style.css:87). Determines vertical paper movement.
- **`maxCharsPerLine`**: Hard limit before margin bell rings. Based on paper width calculations.
- **`leftMargin`** & **`topMargin`**: Where text starts on the paper (96px from edges).

---

## 2. Character Width Measurement (main.js:26-40)

### Why This Exists

Since character width depends on font family and font size, we measure it dynamically on page load rather than hardcoding it.

### How It Works

```javascript
function measureCharWidth() {
    // 1. Create invisible span element
    const span = document.createElement('span');
    
    // 2. Apply EXACT same font settings as textarea
    span.style.fontFamily = 'Courier Prime, Courier New, monospace';
    span.style.fontSize = '18px';  // ⚠️ MUST match style.css:86
    
    // 3. Add single character and measure
    span.textContent = 'X';
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    
    return width;  // Returns ~10.8px for 18px Courier Prime
}

CONFIG.charWidth = measureCharWidth();  // Updates CONFIG
```

### Critical Dependencies

When changing font settings, these MUST stay synchronized:
1. **main.js:30** - `fontSize` in measureCharWidth()
2. **style.css:86** - `font-size` in .text-input
3. **style.css:87** - `line-height` in .text-input
4. **main.js:6** - `CONFIG.lineHeight`

---

## 3. Cursor Position Calculation (main.js:42-56)

### How We Track Where the Cursor Is

```javascript
function getCursorPosition() {
    const text = textInput.value;                    // Get all text
    const selectionStart = textInput.selectionStart; // Cursor position in string
    const textBeforeCursor = text.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');      // Split into lines
    
    return {
        line: lines.length - 1,           // Current line number (0-based)
        col: lines[lines.length - 1].length,  // Column position (0-based)
        totalLines: text.split('\n').length   // Total lines in document
    };
}
```

### Return Values

- **`line`**: Which line the cursor is on (0 = first line, 1 = second line, etc.)
- **`col`**: Which character position on that line (0 = start of line)
- **`totalLines`**: Total number of lines in the entire document

---

## 4. Paper Movement Logic (main.js:58-75)

### The Core Algorithm

This is the heart of the entire application. When you type, the paper moves.

```javascript
function updatePaperPosition() {
    const pos = getCursorPosition();
    
    // Calculate how far to move paper horizontally
    const xOffset = pos.col * CONFIG.charWidth;
    
    // Calculate how far to move paper vertically
    const yOffset = pos.line * CONFIG.lineHeight;
    
    // Move the paper (NEGATIVE because paper moves opposite to cursor direction)
    paperContainer.style.transform = `translate(${-xOffset}px, ${-yOffset}px)`;
    
    // Update UI indicators
    lineNum.textContent = pos.line + 1;
    
    // Show margin warning if near edge
    if (pos.col >= CONFIG.maxCharsPerLine - 3) {
        marginWarning.classList.add('show');
    } else {
        marginWarning.classList.remove('show');
    }
}
```

### Why Movement is Negative

The paper moves in the **opposite direction** of where you'd expect the cursor to go:

- Type 5 characters → cursor should move **right** → paper moves **left** (-54px)
- Type 2 lines → cursor should move **down** → paper moves **up** (-50px)

### Example Calculation

**Scenario**: You type "Hello" (5 characters) on line 3.

```
pos.col = 5
pos.line = 2  (0-based, so line 3)

xOffset = 5 × 10.8 = 54px
yOffset = 2 × 25 = 50px

transform = translate(-54px, -50px)
```

The paper moves 54px left and 50px up, making it appear the cursor moved right and down.

---

## 5. Width & Line Length Calculations

### Paper Width Breakdown

```
Total paper width: 800px (style.css:47)
├── Left margin: 96px (CONFIG.leftMargin)
├── Text area: 608px (800 - 96 - 96)
└── Right margin: 96px (CONFIG.leftMargin)
```

### How maxCharsPerLine is Determined

```
Available text width = 608px
Character width = 10.8px
Max characters = 608 ÷ 10.8 ≈ 56 characters

CONFIG.maxCharsPerLine = 55 (slightly conservative)
```

### When Font Size Changes

**IF** you change font size from 18px to (for example) 24px:

1. Character width increases from ~10.8px to ~14.4px
2. Same 608px width now fits fewer characters: 608 ÷ 14.4 ≈ 42 characters
3. You MUST update `CONFIG.maxCharsPerLine` to 42 (or less)
4. Paper movement changes: 5 characters now moves 72px instead of 54px

**Formula**:
```javascript
maxCharsPerLine = Math.floor((800 - 192) / charWidth) - 1  // -1 for safety margin
```

---

## 6. Margin Warning System (main.js:69-74, 77-81, 173-205)

### Three-Stage Warning System

1. **Stage 1: Visual Warning** (52 characters)
   ```javascript
   if (pos.col >= CONFIG.maxCharsPerLine - 3) {  // 55 - 3 = 52
       marginWarning.classList.add('show');  // Orange bell appears
   }
   ```

2. **Stage 2: Hard Stop** (55 characters)
   ```javascript
   function isAtMargin() {
       return pos.col >= CONFIG.maxCharsPerLine;  // Can't type more
   }
   ```

3. **Stage 3: Bell Animation** (when blocked)
   ```javascript
   if (!isAllowedKey && !isControlKey && e.key.length === 1) {
       e.preventDefault();  // Block the keystroke
       marginWarning.classList.add('show');
       setTimeout(() => marginWarning.classList.remove('show'), 500);
   }
   ```

### Allowed Keys When at Margin

Even when at margin (55+ chars), you can still:
- Press **Enter** (new line)
- Press **Backspace/Delete** (remove characters) *unless in typewriter mode*
- Use **Arrow keys** (navigate)
- Use **Ctrl/Cmd shortcuts** (copy, paste, select all, etc.)

---

## 7. Vertical Movement (Line Height)

### CSS Line Height (style.css:87)

```css
.text-input {
    line-height: 25px;  /* ⚠️ MUST match CONFIG.lineHeight */
}
```

### Paper Texture Lines (style.css:66-72)

The visual horizontal lines on the paper are created with:
```css
repeating-linear-gradient(
    0deg,
    transparent,
    transparent 24px,    /* 25px - 1px for line */
    rgba(0,0,0,0.03) 24px,
    rgba(0,0,0,0.03) 25px  /* ⚠️ MUST match lineHeight */
);
```

If you change line height to (for example) 30px:
1. Update `CONFIG.lineHeight = 30` (main.js:6)
2. Update `line-height: 30px` (style.css:87)
3. Update gradient `24px → 29px` and `25px → 30px` (style.css:70-72)

---

## 8. Text Input Positioning (style.css:79-103)

### How Text Appears on Paper

```css
.text-input {
    position: absolute;
    top: 96px;           /* ⚠️ Matches CONFIG.topMargin */
    left: 96px;          /* ⚠️ Matches CONFIG.leftMargin */
    width: calc(100% - 192px);   /* 800 - 96 - 96 */
    height: calc(100% - 192px);  /* 1000 - 96 - 96 */
    
    font-size: 18px;     /* ⚠️ Must match measureCharWidth() */
    line-height: 25px;   /* ⚠️ Must match CONFIG.lineHeight */
    
    caret-color: transparent;  /* Hide default cursor */
    background: transparent;   /* See paper through it */
    overflow: hidden;          /* No scrolling */
    white-space: pre;          /* Preserve spaces/tabs */
}
```

### Why Margins Matter

The textarea is positioned 96px from top and left. This means:
- **First character** starts at coordinates (96, 96) on the paper
- **Paper container** is positioned to align this with the fixed cursor
- **Margin values** must match in CSS and CONFIG

---

## 9. Paper Container Positioning (style.css:34-43)

### Initial Position

```css
.paper-container {
    position: fixed;
    left: calc(50% - 96px);      /* Center - leftMargin offset */
    top: calc(50% + 125px - 11px);  /* Lowered to align with cursor */
    transform: translate(0, 0);  /* Initial position (0, 0) */
    transition: transform 0.08s; /* Smooth movement */
}
```

### Why These Magic Numbers?

- **`50% - 96px`**: Centers paper, then shifts left by margin amount so first character aligns with cursor
- **`50% + 125px - 11px`**: 
  - `50%` = vertical center
  - `+ 125px` = lowered by 5 lines (5 × 25px) for visual balance
  - `- 11px` = half of cursor height (22px ÷ 2) for pixel-perfect alignment

---

## 10. The Complete Movement Chain

### What Happens When You Type a Character

```
1. User presses 'A' key
   ↓
2. Browser adds 'A' to textarea value
   ↓
3. 'input' event fires (main.js:156)
   ↓
4. updatePaperPosition() called (main.js:161)
   ↓
5. getCursorPosition() calculates new position
   │  - selectionStart increases by 1
   │  - col increases by 1
   ↓
6. xOffset calculated: col × charWidth
   │  Example: 5 × 10.8 = 54px
   ↓
7. Paper transform updated:
   │  transform: translate(-54px, -50px)
   ↓
8. CSS transition animates paper movement (0.08s)
   ↓
9. Paper slides left, cursor appears to move right
```

### What Happens When You Press Enter

```
1. User presses 'Enter'
   ↓
2. Newline '\n' added to textarea
   ↓
3. getCursorPosition() recalculates
   │  - line increases by 1
   │  - col resets to 0
   ↓
4. New offsets calculated:
   │  - xOffset = 0 (back to start of line)
   │  - yOffset increases by 25px
   ↓
5. Paper transform: translate(0px, -75px)
   ↓
6. Paper slides right (back to left margin)
   │  AND slides up (down one line)
   ↓
7. Simulates carriage return on real typewriter
```

---

## 11. Responsive Sizing Considerations

### Current System (Width Based on Character Count)

**Pros:**
- Predictable character limits
- Easy margin calculations
- Matches real typewriter behavior

**Cons:**
- Hardcoded pixel values
- Not responsive to screen size
- Changing font size requires manual updates

### Alternative Approach (Width Based on Paper Width)

**Current Formula:**
```javascript
maxCharsPerLine = 55  // Hardcoded
charWidth = measureCharWidth()  // ~10.8px
textAreaWidth = 608px  // Fixed
```

**Potential Dynamic Formula:**
```javascript
// Get actual paper width
const paperWidth = 800;  // or measure from DOM
const margins = CONFIG.leftMargin + CONFIG.leftMargin;  // 192px
const availableWidth = paperWidth - margins;  // 608px

// Measure character width
const charWidth = measureCharWidth();  // Based on current font

// Calculate max characters dynamically
CONFIG.maxCharsPerLine = Math.floor(availableWidth / charWidth) - 1;

// Now if you change font size:
// - charWidth auto-updates via measureCharWidth()
// - maxCharsPerLine auto-recalculates
// - No manual intervention needed
```

**Benefits:**
- Change font size → everything adapts automatically
- Change paper width → character limit updates
- More maintainable

**Implementation:**
```javascript
function recalculateConfig() {
    const paperWidth = 800;  // Could also: paperContainer.offsetWidth
    const availableWidth = paperWidth - (CONFIG.leftMargin * 2);
    
    CONFIG.charWidth = measureCharWidth();
    CONFIG.maxCharsPerLine = Math.floor(availableWidth / CONFIG.charWidth) - 1;
}

// Call on startup and when font size changes
window.addEventListener('load', recalculateConfig);
```

---

## 12. Font Size Change Checklist

### Current Manual Process

When changing from 18px to a new size (e.g., 24px):

**Step 1: Update CSS**
- [ ] Update `.text-input { font-size: 24px; }` (style.css:86)
- [ ] Update `.text-input { line-height: ??px; }` (style.css:87)
- [ ] Update paper texture gradient lines (style.css:70-72)

**Step 2: Update JavaScript**
- [ ] Update `measureCharWidth()` fontSize (main.js:30)
- [ ] Update `CONFIG.lineHeight` (main.js:6)
- [ ] Recalculate `CONFIG.maxCharsPerLine` based on new width

**Step 3: Test**
- [ ] Verify cursor aligns with text
- [ ] Verify line breaks align with paper lines
- [ ] Verify margin warning triggers correctly
- [ ] Test paper movement feels smooth

### Proposed Automated Process

Make these changes once:

```javascript
// Add to main.js
const FONT_CONFIG = {
    size: 18,        // Single source of truth
    lineHeight: 25   // Single source of truth
};

function measureCharWidth() {
    const span = document.createElement('span');
    span.style.fontFamily = 'Courier Prime, Courier New, monospace';
    span.style.fontSize = FONT_CONFIG.size + 'px';  // Use config
    // ... rest of function
}

function recalculateConfig() {
    CONFIG.charWidth = measureCharWidth();
    CONFIG.lineHeight = FONT_CONFIG.lineHeight;
    
    const paperWidth = 800;
    const availableWidth = paperWidth - (CONFIG.leftMargin * 2);
    CONFIG.maxCharsPerLine = Math.floor(availableWidth / CONFIG.charWidth) - 1;
}
```

Then in CSS, use CSS variables or just keep manually synced (CSS can't read JS):

```css
/* Update these manually when changing FONT_CONFIG in JS */
.text-input {
    font-size: 18px;      /* Must match FONT_CONFIG.size */
    line-height: 25px;    /* Must match FONT_CONFIG.lineHeight */
}
```

**New process to change font size:**
1. Update `FONT_CONFIG.size` in main.js
2. Update `FONT_CONFIG.lineHeight` in main.js (typically size × 1.4)
3. Update matching values in style.css
4. Everything else recalculates automatically

---

## 13. Why Text Moves More Than Cursor

### The Problem

You mentioned: "when I change the text size, the text moves more than the cursor moves"

### Root Cause

This happens when character width and line height are out of sync:

**Example Mismatch:**
```javascript
// In JavaScript
CONFIG.charWidth = 10.8  // Measured for 18px font

// In CSS
.text-input {
    font-size: 24px;  // Changed, but JS not updated!
}
```

**Result:**
- Actual character width is now ~14.4px
- Paper moves using old 10.8px value
- Paper movement = 5 chars × 10.8 = 54px
- Actual text width = 5 chars × 14.4 = 72px
- Text overshoots cursor by 18px

### The Fix

Always keep these synchronized:
1. **style.css:86** - CSS font-size
2. **main.js:30** - measureCharWidth() font-size
3. **Call** `CONFIG.charWidth = measureCharWidth()` after any font change

### Diagnostic Test

To check if values are in sync:

```javascript
// Add to browser console
console.log('CSS font size:', getComputedStyle(textInput).fontSize);
console.log('Measured char width:', CONFIG.charWidth);
console.log('Expected chars per line:', (608 / CONFIG.charWidth).toFixed(2));
console.log('Configured max chars:', CONFIG.maxCharsPerLine);
```

Should show:
```
CSS font size: 18px
Measured char width: 10.8
Expected chars per line: 56.30
Configured max chars: 55
```

---

## 14. File Reference Guide

### main.js (255 lines)

| Lines | Purpose | Affected By Font Size |
|-------|---------|----------------------|
| 4-10 | CONFIG constants | lineHeight (line 6) |
| 26-40 | Character width measurement | fontSize (line 30) ✓ |
| 42-56 | Cursor position calculation | No |
| 58-75 | **Paper movement (CORE)** | charWidth & lineHeight ✓ |
| 77-81 | Margin checking | maxCharsPerLine |
| 156-161 | Input event handler | No |
| 164-207 | Keydown event handler | No |
| 249-251 | Resize handler | No |

### style.css (260 lines)

| Lines | Purpose | Affected By Font Size |
|-------|---------|----------------------|
| 15-27 | Fixed cursor position | No |
| 35-43 | Paper container positioning | Indirectly (alignment) |
| 47-56 | Paper dimensions | No |
| 66-72 | **Paper texture lines** | lineHeight ✓ |
| 79-103 | **Text input styling** | fontSize, lineHeight ✓ |
| 86 | Font size (18px) | ✓ PRIMARY |
| 87 | Line height (25px) | ✓ PRIMARY |
| 114-143 | Margin warning | No |

---

## 15. Key Interdependencies Map

```
FONT SIZE (18px)
├── Controls → Character Width (~10.8px)
│   ├── Affects → Horizontal Paper Movement (xOffset = col × charWidth)
│   └── Affects → Max Characters Per Line (608px ÷ charWidth)
│
└── Controls → Line Height (25px)
    ├── Affects → Vertical Paper Movement (yOffset = line × lineHeight)
    └── Affects → Paper Texture Line Spacing (gradient every 25px)

CHARACTER WIDTH (10.8px)
├── Measured in → measureCharWidth() [main.js:26-40]
├── Stored in → CONFIG.charWidth [main.js:5]
├── Used in → updatePaperPosition() [main.js:62]
└── Determines → CONFIG.maxCharsPerLine [main.js:7]

LINE HEIGHT (25px)
├── Defined in → CONFIG.lineHeight [main.js:6]
├── Must match → style.css line-height [line 87]
├── Must match → Paper texture gradient [style.css:70-72]
└── Used in → updatePaperPosition() [main.js:63]

PAPER MOVEMENT
├── Horizontal → translate(-xOffset, ...)
│   └── xOffset = cursor.col × CONFIG.charWidth
└── Vertical → translate(..., -yOffset)
    └── yOffset = cursor.line × CONFIG.lineHeight
```

---

## 16. Common Issues & Solutions

### Issue: Cursor doesn't align with text

**Symptoms:** Orange cursor appears left/right of where text actually is

**Cause:** Character width mismatch

**Fix:**
```javascript
// 1. Check current values
console.log('CSS font:', getComputedStyle(textInput).fontSize);
console.log('JS measured:', measureCharWidth());
console.log('CONFIG value:', CONFIG.charWidth);

// 2. Ensure main.js:30 matches style.css:86
// 3. Restart page to remeasure
```

### Issue: Cursor doesn't align with line

**Symptoms:** Cursor appears above/below current line of text

**Cause:** Line height mismatch

**Fix:**
```javascript
// 1. Check values
console.log('CSS line-height:', getComputedStyle(textInput).lineHeight);
console.log('CONFIG.lineHeight:', CONFIG.lineHeight);

// 2. Ensure main.js:6 matches style.css:87
```

### Issue: Text wraps unexpectedly

**Symptoms:** Text wraps before reaching margin warning

**Cause:** CSS text-wrapping is enabled

**Fix:**
```css
.text-input {
    white-space: pre;       /* Preserve whitespace, no wrap */
    word-wrap: normal;      /* Don't wrap words */
    overflow-wrap: normal;  /* Don't break words */
}
```

### Issue: Margin warning doesn't appear

**Symptoms:** No orange bell when typing near edge

**Cause:** maxCharsPerLine is set too high for actual paper width

**Fix:**
```javascript
// Recalculate based on actual width
const availableWidth = 800 - 192;  // 608px
CONFIG.maxCharsPerLine = Math.floor(availableWidth / CONFIG.charWidth) - 1;
```

---

## 17. Testing Checklist

After any changes to font size, margins, or dimensions:

- [ ] **Type single character**: Does paper move smoothly left?
- [ ] **Type to edge**: Does margin warning appear at ~52 chars?
- [ ] **Type past edge**: Does bell ring and block at 55 chars?
- [ ] **Press Enter**: Does paper slide right and down?
- [ ] **Type multiple lines**: Does cursor stay aligned?
- [ ] **Check line spacing**: Do lines align with paper texture?
- [ ] **Resize window**: Does position stay correct?
- [ ] **Toggle typewriter mode**: Does it prevent edits correctly?

---

## Summary

### The Three Pillars of Movement

1. **Character Width** (horizontal spacing)
   - Measured: `measureCharWidth()`
   - Stored: `CONFIG.charWidth`
   - Used: `xOffset = col × charWidth`

2. **Line Height** (vertical spacing)
   - Defined: `CONFIG.lineHeight`
   - Synced: CSS `line-height`
   - Used: `yOffset = line × lineHeight`

3. **Paper Transform** (the actual movement)
   - Calculated: `translate(-xOffset, -yOffset)`
   - Applied: `paperContainer.style.transform`
   - Animated: CSS transition (0.08s)

### Single Source of Truth

To make font size changes easy, maintain ONE place to change settings:

```javascript
// In main.js - SINGLE SOURCE OF TRUTH
const FONT_CONFIG = {
    size: 18,
    lineHeight: 25
};

// Then sync CSS manually (CSS can't import from JS)
// style.css:86 → font-size: 18px
// style.css:87 → line-height: 25px
```

Change `FONT_CONFIG`, update CSS, reload page → everything recalculates.

### The Golden Rule

**Whenever font size changes, cursor movement logic MUST change.**

Why? Because character width changes, which changes how far the paper must move to keep the cursor aligned with text.
