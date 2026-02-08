import './style.css'

// Font configuration - single source of truth
const FONT_CONFIG = {
    size: 18,
    lineHeight: 25,
    family: 'Courier Prime, Courier New, monospace'
};

// Configuration
const CONFIG = {
    charWidth: 10.8,
    lineHeight: 25,
    maxCharsPerLine: 55,
    leftMargin: 96,
    topMargin: 96,
    paperWidth: 800,
    basePaperWidth: 800  // Original paper width for reference
};

// State
const STATE = {
    typewriterMode: false,
    lastLineNumber: 0,
    ibmImageVisible: true,
    marginAlertEnabled: true
};

// Elements
const paperContainer = document.getElementById('paperContainer');
const paper = document.querySelector('.paper');
const textInput = document.getElementById('textInput');
const marginWarning = document.getElementById('marginWarning');
const lineNum = document.getElementById('lineNum');
const typewriterModeCheckbox = document.getElementById('typewriterModeCheckbox');
const toggleLabel = document.getElementById('toggleLabel');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const paperPreviews = document.querySelectorAll('.paper-preview');
const fontFamilyPreviews = document.querySelectorAll('.font-family-preview');
const fontSizePreviews = document.querySelectorAll('.font-size-preview');
const marginPreviews = document.querySelectorAll('.margin-preview');
const bgColorPreviews = document.querySelectorAll('.color-preview');
const textColorPreviews = document.querySelectorAll('.text-color-preview');
const cursorColorPreviews = document.querySelectorAll('.cursor-color-preview');
const minimizeBtn = document.getElementById('minimizeBtn');
const settingsHeader = document.getElementById('settingsHeader');
const settingsContent = document.getElementById('settingsContent');
const settingsMenu = document.getElementById('settingsMenu');
const customTextColorBtn = document.getElementById('customTextColorBtn');
const customTextColorInput = document.getElementById('customTextColorInput');
const textColorHexInput = document.getElementById('textColorHexInput');
const applyTextColor = document.getElementById('applyTextColor');
const customCursorColorBtn = document.getElementById('customCursorColorBtn');
const customCursorColorInput = document.getElementById('customCursorColorInput');
const cursorColorHexInput = document.getElementById('cursorColorHexInput');
const applyCursorColor = document.getElementById('applyCursorColor');
const ibmToggleCheckbox = document.getElementById('ibmToggleCheckbox');
const ibmLogo = document.querySelector('.ibm-logo');
const screenSizeElement = document.getElementById('screenSize');
const marginAlertToggle = document.getElementById('marginAlertToggle');

// Measure actual character width
function measureCharWidth() {
    const span = document.createElement('span');
    span.style.fontFamily = FONT_CONFIG.family;
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
    
    // Get current paper width (responsive)
    updatePaperWidth();
    
    // Calculate max characters per line based on available paper width
    const availableWidth = CONFIG.paperWidth - (CONFIG.leftMargin * 2);
    CONFIG.maxCharsPerLine = Math.floor(availableWidth / CONFIG.charWidth) - 1;
    
    console.log('Font config updated:', {
        fontSize: FONT_CONFIG.size,
        charWidth: CONFIG.charWidth,
        lineHeight: CONFIG.lineHeight,
        paperWidth: CONFIG.paperWidth,
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

// Update paper texture
function updatePaperTexture(paperType) {
    // Remove all previous paper classes
    paper.classList.remove('texture-paper');
    
    if (paperType === 'default') {
        // Use default CSS gradient lines
        document.documentElement.style.removeProperty('--paper-texture');
    } else {
        // Use image texture (paper1, paper2, paper3)
        paper.classList.add('texture-paper');
        document.documentElement.style.setProperty('--paper-texture', `url('/${paperType}.jpg')`);
    }
    
    // Update active state on previews
    paperPreviews.forEach(preview => {
        if (preview.dataset.paper === paperType) {
            preview.classList.add('active');
        } else {
            preview.classList.remove('active');
        }
    });
}

// Dynamically expand paper height based on content
function updatePaperHeight() {
    const pos = getCursorPosition();
    
    // Calculate required height based on total lines
    // Add extra space (2x viewport height) to ensure smooth scrolling
    const requiredHeight = (pos.totalLines * CONFIG.lineHeight) + (CONFIG.topMargin * 2) + (window.innerHeight * 2);
    
    // Always keep paper large enough
    const currentHeight = paper.offsetHeight;
    if (requiredHeight > currentHeight) {
        paper.style.minHeight = requiredHeight + 'px';
    }
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

// Update cursor height to match font size
function updateCursorHeight() {
    // Cursor height should be approximately 1.3x the font size for visual balance
    const cursorHeight = Math.round(FONT_CONFIG.size * 1.3);
    document.documentElement.style.setProperty('--cursor-height', cursorHeight + 'px');
    
    // Calculate vertical offset to keep cursor aligned with text center
    // As font size decreases, we need to adjust the cursor position slightly up
    // Base offset at 18px (default) = 0
    // For smaller fonts, move cursor up; for larger fonts, move down
    const baseSize = 18;
    const offsetAdjustment = (FONT_CONFIG.size - baseSize) * 0.5;
    document.documentElement.style.setProperty('--cursor-offset', offsetAdjustment + 'px');
}

// Update paper width based on screen size
function updatePaperWidth() {
    const screenWidth = window.innerWidth;
    
    // Responsive paper width calculation
    if (screenWidth <= 480) {
        // Mobile: full width
        CONFIG.paperWidth = screenWidth;
    } else if (screenWidth <= 768) {
        // Tablet: 95% width, max 600px
        CONFIG.paperWidth = Math.min(screenWidth * 0.95, 600);
    } else if (screenWidth <= 1024) {
        // Small desktop: 90% width, max 800px
        CONFIG.paperWidth = Math.min(screenWidth * 0.9, 800);
    } else {
        // Large desktop: fixed 800px
        CONFIG.paperWidth = CONFIG.basePaperWidth;
    }
}

// Detect and display screen size
function updateScreenSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let deviceType = '';
    if (width <= 480) {
        deviceType = 'Mobile';
    } else if (width <= 768) {
        deviceType = 'Tablet';
    } else if (width <= 1024) {
        deviceType = 'Small Desktop';
    } else {
        deviceType = 'Desktop';
    }
    
    screenSizeElement.textContent = `${width}×${height}px (${deviceType})`;
}

// Toggle IBM image visibility
function toggleIBMImage(visible) {
    STATE.ibmImageVisible = visible;
    if (visible) {
        ibmLogo.classList.remove('hidden');
    } else {
        ibmLogo.classList.add('hidden');
    }
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
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        textInput.select();
        document.execCommand('copy');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
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
    
    // Update cursor height to match font size
    updateCursorHeight();
    
    // Recalculate all dependent values
    recalculateConfig();
    
    // Update paper position to maintain alignment
    updatePaperPosition();
}

// Update font family
function updateFontFamily(fontKey) {
    const fontMap = {
        'courier': 'Courier Prime, Courier New, monospace',
        'special-elite': 'Special Elite, monospace',
        'spectral': 'Spectral, serif'
    };
    
    FONT_CONFIG.family = fontMap[fontKey] || fontMap['courier'];
    
    // Update CSS for textarea
    textInput.style.fontFamily = FONT_CONFIG.family;
    
    // Recalculate character width since different fonts have different widths
    recalculateConfig();
    
    // Update paper position to maintain alignment
    updatePaperPosition();
}

// Initialize configuration on startup
recalculateConfig();
updateCursorHeight();

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
    
    // Show warning when near margin (only if margin alert is enabled)
    if (STATE.marginAlertEnabled && pos.col >= CONFIG.maxCharsPerLine - 3) {
        marginWarning.classList.add('show');
    } else {
        marginWarning.classList.remove('show');
    }
    
    // Dynamically expand paper height for infinite scroll
    updatePaperHeight();
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
            // Trigger bell animation (only if margin alert is enabled)
            if (STATE.marginAlertEnabled) {
                marginWarning.classList.add('show');
                setTimeout(() => {
                    marginWarning.classList.remove('show');
                }, 500);
            }
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

// Font family selector - circular buttons
fontFamilyPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const font = preview.dataset.font;
        updateFontFamily(font);
        
        // Update active state
        fontFamilyPreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
    });
});

// Font size selector - circular buttons
fontSizePreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const size = preview.dataset.size;
        updateFontSize(size);
        
        // Update active state
        fontSizePreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
    });
});

// Margin selector - circular buttons
marginPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const margin = preview.dataset.margin;
        updateMargins(margin);
        
        // Update active state
        marginPreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
    });
});

// Background color selector - circular buttons
bgColorPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const color = preview.dataset.color;
        updateBgColor(color);
        
        // Update active state
        bgColorPreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
    });
});

// Text color selector - circular buttons
textColorPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        // Check if it's the custom color button
        if (preview.classList.contains('custom-color-btn')) {
            // Toggle custom color input
            const isVisible = customTextColorInput.style.display === 'flex';
            customTextColorInput.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                customCursorColorInput.style.display = 'none'; // Close other custom input
            }
            return;
        }
        
        const color = preview.dataset.color;
        updateTextColor(color);
        
        // Update active state
        textColorPreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
        
        // Hide custom color input
        customTextColorInput.style.display = 'none';
    });
});

// Cursor color selector - circular buttons
cursorColorPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        // Check if it's the custom color button
        if (preview.classList.contains('custom-color-btn')) {
            // Toggle custom color input
            const isVisible = customCursorColorInput.style.display === 'flex';
            customCursorColorInput.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                customTextColorInput.style.display = 'none'; // Close other custom input
            }
            return;
        }
        
        const color = preview.dataset.color;
        updateCursorColor(color);
        
        // Update active state
        cursorColorPreviews.forEach(p => p.classList.remove('active'));
        preview.classList.add('active');
        
        // Hide custom color input
        customCursorColorInput.style.display = 'none';
    });
});

// Custom text color handler
applyTextColor.addEventListener('click', () => {
    const hexValue = textColorHexInput.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
        updateTextColor(hexValue);
        customTextColorInput.style.display = 'none';
        
        // Mark custom button as active
        textColorPreviews.forEach(p => p.classList.remove('active'));
        customTextColorBtn.classList.add('active');
        
        // Update custom button preview background but keep + symbol
        const customCircle = customTextColorBtn.querySelector('.color-circle');
        customCircle.style.background = hexValue;
        customCircle.textContent = '+';
    }
});

// Custom cursor color handler
applyCursorColor.addEventListener('click', () => {
    const hexValue = cursorColorHexInput.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
        updateCursorColor(hexValue);
        customCursorColorInput.style.display = 'none';
        
        // Mark custom button as active
        cursorColorPreviews.forEach(p => p.classList.remove('active'));
        customCursorColorBtn.classList.add('active');
        
        // Update custom button preview background but keep + symbol
        const customCircle = customCursorColorBtn.querySelector('.color-circle');
        customCircle.style.background = hexValue;
        customCircle.textContent = '+';
    }
});

// Settings panel minimize/expand toggle - entire header is clickable
settingsHeader.addEventListener('click', (e) => {
    // Don't toggle if clicking the minimize button specifically (it handles its own click)
    if (e.target === minimizeBtn || e.target.closest('.minimize-btn')) {
        return;
    }
    
    settingsContent.classList.toggle('collapsed');
    settingsMenu.classList.toggle('minimized');
    
    // Toggle button text
    if (settingsContent.classList.contains('collapsed')) {
        minimizeBtn.textContent = '+';
        // Auto-focus textarea when settings are closed
        setTimeout(() => textInput.focus(), 100);
    } else {
        minimizeBtn.textContent = '−';
    }
});

// Minimize button also works independently
minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent double-toggle from header click
    settingsContent.classList.toggle('collapsed');
    settingsMenu.classList.toggle('minimized');
    
    // Toggle button text
    if (settingsContent.classList.contains('collapsed')) {
        minimizeBtn.textContent = '+';
        // Auto-focus textarea when settings are closed
        setTimeout(() => textInput.focus(), 100);
    } else {
        minimizeBtn.textContent = '−';
    }
});

// Download button
downloadBtn.addEventListener('click', () => {
    downloadText();
});

// Copy button
copyBtn.addEventListener('click', () => {
    copyText();
});

// Paper texture selector
paperPreviews.forEach(preview => {
    preview.addEventListener('click', () => {
        const paperType = preview.dataset.paper;
        updatePaperTexture(paperType);
    });
});

// IBM image toggle
ibmToggleCheckbox.addEventListener('change', (e) => {
    toggleIBMImage(e.target.checked);
});

// Margin alert toggle
marginAlertToggle.addEventListener('change', (e) => {
    STATE.marginAlertEnabled = e.target.checked;
    // If disabled, immediately hide any visible margin warning
    if (!STATE.marginAlertEnabled) {
        marginWarning.classList.remove('show');
    } else {
        // If enabled, check if we should show it based on current position
        updatePaperPosition();
    }
});

// Focus on load
window.addEventListener('load', () => {
    textInput.focus();
    updatePaperPosition();
    updateScreenSize();
});

// Keep focus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.text-input') && !e.target.closest('.settings-menu')) {
        textInput.focus();
    }
});

// Handle resize
window.addEventListener('resize', () => {
    updatePaperWidth();
    recalculateConfig();
    updatePaperPosition();
    updateScreenSize();
});

// Initial position
updatePaperPosition();
