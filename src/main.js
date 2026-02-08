import './style.css'

// Font configuration - single source of truth
const FONT_CONFIG = {
    size: 18,
    lineHeight: 25
};

// Configuration
const CONFIG = {
    charWidth: 10.8,
    lineHeight: 25,
    maxCharsPerLine: 55,
    leftMargin: 96,
    topMargin: 96,
    paperWidth: 800
};

// State
const STATE = {
    typewriterMode: false,
    lastLineNumber: 0
};

// Elements
const paperContainer = document.getElementById('paperContainer');
const textInput = document.getElementById('textInput');
const marginWarning = document.getElementById('marginWarning');
const lineNum = document.getElementById('lineNum');
const typewriterModeCheckbox = document.getElementById('typewriterModeCheckbox');
const toggleLabel = document.getElementById('toggleLabel');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const marginSelect = document.getElementById('marginSelect');
const textColorSelect = document.getElementById('textColorSelect');
const cursorColorSelect = document.getElementById('cursorColorSelect');
const bgColorSelect = document.getElementById('bgColorSelect');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');

// Measure actual character width
function measureCharWidth() {
    const span = document.createElement('span');
    span.style.fontFamily = 'Courier Prime, Courier New, monospace';
    span.style.fontSize = FONT_CONFIG.size + 'px';
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.textContent = 'X';
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    return width;
}

// Recalculate all font-dependent configuration
function recalculateConfig() {
    // Measure character width based on current font size
    CONFIG.charWidth = measureCharWidth();
    
    // Update line height (proportional to font size, typically 1.4x)
    CONFIG.lineHeight = FONT_CONFIG.lineHeight;
    
    // Calculate max characters per line based on available paper width
    const availableWidth = CONFIG.paperWidth - (CONFIG.leftMargin * 2);
    CONFIG.maxCharsPerLine = Math.floor(availableWidth / CONFIG.charWidth) - 1;
    
    console.log('Font config updated:', {
        fontSize: FONT_CONFIG.size,
        charWidth: CONFIG.charWidth,
        lineHeight: CONFIG.lineHeight,
        maxCharsPerLine: CONFIG.maxCharsPerLine,
        margins: CONFIG.leftMargin
    });
}

// Update margins and all dependent systems
function updateMargins(newMargin) {
    const margin = parseInt(newMargin);
    CONFIG.leftMargin = margin;
    CONFIG.topMargin = margin;
    
    // Update CSS custom property for margins
    document.documentElement.style.setProperty('--margin', margin + 'px');
    
    // Recalculate max characters per line based on new available width
    recalculateConfig();
    
    // Update paper position to maintain alignment
    updatePaperPosition();
}

// Update text color
function updateTextColor(color) {
    document.documentElement.style.setProperty('--text-color', color);
}

// Update cursor color
function updateCursorColor(color) {
    document.documentElement.style.setProperty('--cursor-color', color);
    // Also update the box shadow to match cursor color
    const cursor = document.querySelector('.cursor');
    const rgb = hexToRgb(color);
    if (rgb) {
        cursor.style.boxShadow = `0 0 4px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
    }
}

// Update background color
function updateBgColor(color) {
    document.documentElement.style.setProperty('--bg-color', color);
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Download text as TXT file
function downloadText() {
    const text = textInput.value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typewriter-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Copy text to clipboard
async function copyText() {
    const text = textInput.value;
    try {
        await navigator.clipboard.writeText(text);
        // Visual feedback
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Text';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        textInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Text';
        }, 2000);
    }
}

// Update font size and all dependent systems
function updateFontSize(newSize) {
    FONT_CONFIG.size = parseInt(newSize);
    
    // Calculate proportional line height (1.4x font size, rounded to nearest pixel)
    FONT_CONFIG.lineHeight = Math.round(FONT_CONFIG.size * 1.39);
    
    // Update CSS for textarea
    textInput.style.fontSize = FONT_CONFIG.size + 'px';
    textInput.style.lineHeight = FONT_CONFIG.lineHeight + 'px';
    
    // Update paper texture by modifying CSS custom property
    document.documentElement.style.setProperty('--line-height', FONT_CONFIG.lineHeight + 'px');
    
    // Recalculate all dependent values
    recalculateConfig();
    
    // Update paper position to maintain alignment
    updatePaperPosition();
}

// Initialize configuration on startup
recalculateConfig();

// Get cursor position in text
function getCursorPosition() {
    const text = textInput.value;
    const selectionStart = textInput.selectionStart;
    const textBeforeCursor = text.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];
    
    return {
        line: currentLineIndex,
        col: currentLineText.length,
        totalLines: text.split('\n').length
    };
}

// Update paper position
function updatePaperPosition() {
    const pos = getCursorPosition();
    
    const xOffset = pos.col * CONFIG.charWidth;
    const yOffset = pos.line * CONFIG.lineHeight;
    
    paperContainer.style.transform = `translate(${-xOffset}px, ${-yOffset}px)`;
    
    lineNum.textContent = pos.line + 1;
    
    // Show warning when near margin
    if (pos.col >= CONFIG.maxCharsPerLine - 3) {
        marginWarning.classList.add('show');
    } else {
        marginWarning.classList.remove('show');
    }
}

// Check if at margin
function isAtMargin() {
    const pos = getCursorPosition();
    return pos.col >= CONFIG.maxCharsPerLine;
}

// Typewriter mode: Check if trying to go to previous line
function isMovingToPreviousLine(e) {
    if (!STATE.typewriterMode) return false;
    
    const currentPos = getCursorPosition();
    const currentLine = currentPos.line;
    
    // Prevent backspace if it would move to previous line
    if (e.key === 'Backspace' && currentPos.col === 0 && currentLine > 0) {
        return true;
    }
    
    // Prevent arrow up
    if (e.key === 'ArrowUp') {
        return true;
    }
    
    // Prevent arrow left if at start of line (would go to previous line)
    if (e.key === 'ArrowLeft' && currentPos.col === 0 && currentLine > 0) {
        return true;
    }
    
    return false;
}

// Typewriter mode: Enforce forward-only typing
function enforceTypewriterMode(e) {
    if (!STATE.typewriterMode) return true;
    
    const pos = getCursorPosition();
    
    // Block backspace entirely
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        return false;
    }
    
    // Block going to previous lines
    if (isMovingToPreviousLine(e)) {
        e.preventDefault();
        return false;
    }
    
    // Only allow typing on current line or moving forward
    if (pos.line < STATE.lastLineNumber) {
        // If somehow cursor is on previous line, prevent all input except Enter
        if (e.key !== 'Enter' && e.key.length === 1) {
            e.preventDefault();
            return false;
        }
    }
    
    return true;
}

// Update typewriter mode state
function updateTypewriterMode(enabled) {
    STATE.typewriterMode = enabled;
    const pos = getCursorPosition();
    STATE.lastLineNumber = pos.line;
    
    // Update UI
    toggleLabel.textContent = `Typewriter Mode: ${enabled ? 'ON' : 'OFF'}`;
    
    // Move cursor to end of text when enabling typewriter mode
    if (enabled) {
        textInput.selectionStart = textInput.value.length;
        textInput.selectionEnd = textInput.value.length;
        updatePaperPosition();
    }
}

// Event listeners
textInput.addEventListener('input', () => {
    const pos = getCursorPosition();
    if (STATE.typewriterMode && pos.line > STATE.lastLineNumber) {
        STATE.lastLineNumber = pos.line;
    }
    updatePaperPosition();
});

textInput.addEventListener('keydown', (e) => {
    // Typewriter mode restrictions first
    if (STATE.typewriterMode) {
        if (!enforceTypewriterMode(e)) {
            return; // Event already prevented in enforceTypewriterMode
        }
    }
    
    // Check if we're at the margin
    if (isAtMargin()) {
        // Only allow these keys when at margin:
        // - Backspace/Delete to remove characters (unless typewriter mode)
        // - Enter to go to new line
        // - Arrow keys for navigation
        // - Ctrl/Cmd+key combinations (select all, copy, paste, etc)
        const allowedKeys = [
            'Backspace',
            'Delete', 
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'Tab'
        ];
        
        const isControlKey = e.ctrlKey || e.metaKey;
        const isAllowedKey = allowedKeys.includes(e.key);
        
        // Block input if it's a character key and we're at margin
        if (!isAllowedKey && !isControlKey && e.key.length === 1) {
            e.preventDefault();
            // Trigger bell animation
            marginWarning.classList.add('show');
            setTimeout(() => {
                marginWarning.classList.remove('show');
            }, 500);
            return;
        }
    }
    
    setTimeout(updatePaperPosition, 0);
});

// Prevent cursor movement to previous lines in typewriter mode
textInput.addEventListener('click', (e) => {
    if (STATE.typewriterMode) {
        setTimeout(() => {
            const pos = getCursorPosition();
            if (pos.line < STATE.lastLineNumber) {
                // Move cursor to start of last line
                const lines = textInput.value.split('\n');
                let charPosition = 0;
                for (let i = 0; i < STATE.lastLineNumber; i++) {
                    charPosition += lines[i].length + 1; // +1 for \n
                }
                textInput.selectionStart = charPosition;
                textInput.selectionEnd = charPosition;
                updatePaperPosition();
            }
        }, 0);
    }
});

// Toggle typewriter mode
typewriterModeCheckbox.addEventListener('change', (e) => {
    updateTypewriterMode(e.target.checked);
});

// Font size selector
fontSizeSelect.addEventListener('change', (e) => {
    updateFontSize(e.target.value);
});

// Margin selector
marginSelect.addEventListener('change', (e) => {
    updateMargins(e.target.value);
});

// Text color selector
textColorSelect.addEventListener('change', (e) => {
    updateTextColor(e.target.value);
});

// Cursor color selector
cursorColorSelect.addEventListener('change', (e) => {
    updateCursorColor(e.target.value);
});

// Background color selector
bgColorSelect.addEventListener('change', (e) => {
    updateBgColor(e.target.value);
});

// Download button
downloadBtn.addEventListener('click', () => {
    downloadText();
});

// Copy button
copyBtn.addEventListener('click', () => {
    copyText();
});

// Focus on load
window.addEventListener('load', () => {
    textInput.focus();
    updatePaperPosition();
});

// Keep focus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.text-input') && !e.target.closest('.settings-menu')) {
        textInput.focus();
    }
});

// Handle resize
window.addEventListener('resize', () => {
    updatePaperPosition();
});

// Initial position
updatePaperPosition();
