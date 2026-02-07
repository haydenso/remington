import './style.css'

// Configuration
const CONFIG = {
    charWidth: 10.8,
    lineHeight: 25,
    maxCharsPerLine: 40,
    leftMargin: 96,
    topMargin: 96
};

// Elements
const paperContainer = document.getElementById('paperContainer');
const textInput = document.getElementById('textInput');
const marginWarning = document.getElementById('marginWarning');
const lineNum = document.getElementById('lineNum');

// Measure actual character width
function measureCharWidth() {
    const span = document.createElement('span');
    span.style.fontFamily = 'Courier Prime, Courier New, monospace';
    span.style.fontSize = '18px';
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.textContent = 'X';
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    return width;
}

CONFIG.charWidth = measureCharWidth();

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
    if (pos.col >= CONFIG.maxCharsPerLine - 5) {
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

// Event listeners
textInput.addEventListener('input', () => {
    updatePaperPosition();
});

textInput.addEventListener('keydown', (e) => {
    // Check if we're at the margin
    if (isAtMargin()) {
        // Only allow these keys when at margin:
        // - Backspace/Delete to remove characters
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

// Focus on load
window.addEventListener('load', () => {
    textInput.focus();
    updatePaperPosition();
});

// Keep focus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.text-input')) {
        textInput.focus();
    }
});

// Handle resize
window.addEventListener('resize', () => {
    updatePaperPosition();
});

// Initial position
updatePaperPosition();
