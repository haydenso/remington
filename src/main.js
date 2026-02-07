import './style.css'

// Configuration
const CONFIG = {
    charWidth: 10.8,
    lineHeight: 25,
    maxCharsPerLine: 55,
    leftMargin: 96,
    topMargin: 96
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

// Focus on load
window.addEventListener('load', () => {
    textInput.focus();
    updatePaperPosition();
});

// Keep focus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.text-input') && !e.target.closest('.mode-toggle')) {
        textInput.focus();
    }
});

// Handle resize
window.addEventListener('resize', () => {
    updatePaperPosition();
});

// Initial position
updatePaperPosition();
